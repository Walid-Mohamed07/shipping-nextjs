import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Payment, Request, Wallet, Transaction } from "@/lib/models";
import {
  broadcastEvent,
  broadcastToUserAndAdmins,
} from "@/lib/eventBroadcaster";

// Verify Kashier webhook signature
function verifyKashierSignature(payload: any, signature: string): boolean {
  const secretKey = process.env.KASHIER_SECRET_KEY || "";

  // Kashier uses specific fields for signature verification
  const dataToHash = `${payload.merchantId}${payload.orderId}${payload.transactionId}${payload.amount}${payload.currency}${payload.paymentStatus}`;
  const calculatedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(dataToHash)
    .digest("hex");

  return calculatedSignature === signature;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const rawBody = await req.text();
    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("[Kashier Webhook] Invalid JSON payload");
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    console.log(
      "[Kashier Webhook] Received:",
      JSON.stringify(payload, null, 2),
    );
    console.log("[Kashier Webhook] Headers:", {
      signature: req.headers.get("x-kashier-signature"),
      contentType: req.headers.get("content-type"),
    });

    // Verify signature if provided
    const signature =
      payload.signature || req.headers.get("x-kashier-signature");
    if (signature && process.env.KASHIER_SECRET_KEY) {
      const isValid = verifyKashierSignature(payload, signature);
      if (!isValid) {
        console.error("[Kashier Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
      console.log("[Kashier Webhook] Signature verified successfully");
    } else {
      console.warn("[Kashier Webhook] No signature provided (not verifying)");
    }

    // Extract fields from payload (handle various formats Kashier might send)
    const orderRef =
      payload.orderId ||
      payload.merchantOrderId ||
      payload.order ||
      payload.paymentParams?.order ||
      payload._id;

    const transactionId =
      payload.transactionId ||
      payload.transaction_id ||
      payload.paymentParams?.transactionId;

    const amount = payload.amount || payload.paymentParams?.amount;

    const currency = payload.currency || payload.paymentParams?.currency;

    // Check for payment status in various possible fields
    const paymentStatus =
      payload.paymentStatus ||
      payload.status ||
      payload.payment_status ||
      payload.paymentParams?.status;

    const metaData =
      payload.metaData || payload.metadata || payload.paymentParams?.metaData;

    console.log("[Kashier Webhook] Extracted fields:", {
      orderRef,
      transactionId,
      amount,
      currency,
      paymentStatus,
    });

    if (!orderRef) {
      console.error("[Kashier Webhook] No order reference found in payload");
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Find the payment record
    console.log(
      "[Kashier Webhook] Looking for payment with kashierOrderId:",
      orderRef,
    );
    const payment = await Payment.findOne({ kashierOrderId: orderRef });
    if (!payment) {
      console.error("[Kashier Webhook] Payment not found for order:", orderRef);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    console.log("[Kashier Webhook] Payment found:", {
      paymentId: payment._id,
      currentStatus: payment.status,
      amount: payment.amount,
    });

    // Prevent duplicate processing
    if (payment.status === "completed" || payment.status === "failed") {
      console.log(
        "[Kashier Webhook] Payment already processed:",
        payment._id,
        "status:",
        payment.status,
      );
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
      });
    }

    // Update payment with Kashier transaction details
    payment.kashierTransactionId = transactionId;
    payment.kashierResponse = {
      ...payment.kashierResponse,
      webhookPayload: payload,
    };

    const normalizedStatus = paymentStatus?.toLowerCase();
    console.log(
      "[Kashier Webhook] Normalized payment status:",
      normalizedStatus,
      "from raw status:",
      paymentStatus,
    );

    // Handle successful payment (various status values that mean "paid")
    if (
      normalizedStatus === "success" ||
      normalizedStatus === "captured" ||
      normalizedStatus === "paid" ||
      normalizedStatus === "complete" ||
      normalizedStatus === "completed"
    ) {
      // Payment successful
      console.log(
        "[Kashier Webhook] Payment successful, updating to 'completed'",
      );
      payment.status = "completed";
      payment.paidAt = new Date();
      await payment.save();
      console.log(
        "[Kashier Webhook] Payment saved with status:",
        payment.status,
      );

      // Handle wallet deduction if applicable
      const walletDeduction = payment.breakdown?.walletDeduction || 0;
      if (walletDeduction > 0) {
        const wallet = await Wallet.findOne({ user: payment.user });
        if (wallet && wallet.balance >= walletDeduction) {
          const balanceBefore = wallet.balance;
          wallet.balance -= walletDeduction;
          wallet.totalDebits += walletDeduction;
          wallet.lastTransactionAt = new Date();
          await wallet.save();

          // Create wallet transaction
          const transaction = await Transaction.create({
            user: payment.user,
            type: "payment",
            amount: walletDeduction,
            currency: "USD",
            description: `Partial payment for order ${orderRef}`,
            reference: `${orderRef}-WALLET`,
            request: payment.request,
            paymentGateway: {
              provider: "kashier",
              transactionId: transactionId,
              orderId: orderRef,
              status: "completed",
            },
            status: "completed",
            balanceBefore,
            balanceAfter: wallet.balance,
          });

          payment.walletTransactionId = transaction._id;
          await payment.save();
        }
      }

      // Update the request
      console.log("[Kashier Webhook] Updating request:", payment.request);
      const request: any = await Request.findById(payment.request);
      if (request) {
        console.log(
          "[Kashier Webhook] Request found, current status:",
          request.requestStatus,
          "paymentStatus:",
          request.paymentStatus,
        );
        request.paymentStatus = "paid";
        request.paidAmount = payment.amount;
        request.paidAt = new Date();
        // Change status to "Assigned to Company" after successful payment
        request.requestStatus = "Assigned to Company";
        console.log(
          "[Kashier Webhook] Setting request status to 'Assigned to Company'",
        );

        // Add activity to history
        const activityEntry = {
          timestamp: new Date(),
          action: "payment_completed",
          description: `Payment of $${payment.amount} completed successfully`,
          details: {
            paymentId: String(payment._id),
            transactionId: transactionId,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
          },
        };

        if (!request.activityHistory) {
          request.activityHistory = [];
        }
        request.activityHistory.push(activityEntry);

        await request.save();
        console.log(
          "[Kashier Webhook] Request saved successfully. New status:",
          request.requestStatus,
          "paymentStatus:",
          request.paymentStatus,
        );

        // Broadcast real-time event for payment completion
        const requestOwnerId = request.user?.toString() || String(request.user);
        console.log(
          "[Kashier Webhook] Broadcasting PAYMENT_COMPLETED event to user:",
          requestOwnerId,
        );

        broadcastEvent(
          "PAYMENT_COMPLETED",
          {
            requestId: String(request._id),
            paymentId: String(payment._id),
            amount: payment.amount,
            paymentStatus: "completed",
            requestStatus: request.requestStatus,
          },
          {
            requestId: String(request._id),
            targetRoles: ["admin", "operator"],
          },
        );

        // Notify the user who owns the request
        if (requestOwnerId) {
          broadcastToUserAndAdmins(
            requestOwnerId,
            "PAYMENT_COMPLETED",
            {
              requestId: String(request._id),
              paymentId: String(payment._id),
              amount: payment.amount,
              paymentStatus: "completed",
              requestStatus: request.requestStatus,
              message:
                "Payment completed successfully! Your request has been submitted.",
            },
            String(request._id),
          );
        }
      } else {
        console.error("[Kashier Webhook] Request not found:", payment.request);
      }

      console.log(
        "[Kashier Webhook] Payment completed successfully:",
        payment._id,
      );
    } else if (
      normalizedStatus === "failed" ||
      normalizedStatus === "declined" ||
      normalizedStatus === "error"
    ) {
      // Payment failed
      console.log(
        "[Kashier Webhook] Payment failed with status:",
        normalizedStatus,
      );
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason =
        payload.failureReason || payload.message || "Payment declined";
      await payment.save();
      console.log("[Kashier Webhook] Payment saved with failed status");

      // Update request
      console.log(
        "[Kashier Webhook] Updating request to failed payment status",
      );
      const request = await Request.findById(payment.request);
      if (request) {
        request.paymentStatus = "failed";
        await request.save();
        console.log(
          "[Kashier Webhook] Request updated with failed payment status",
        );

        // Broadcast real-time event for payment failure
        const requestOwnerId = request.user?.toString() || String(request.user);
        console.log(
          "[Kashier Webhook] Broadcasting PAYMENT_FAILED event to user:",
          requestOwnerId,
        );

        broadcastEvent(
          "PAYMENT_FAILED",
          {
            requestId: String(request._id),
            paymentId: String(payment._id),
            paymentStatus: "failed",
            failureReason: payment.failureReason,
          },
          {
            requestId: String(request._id),
            targetRoles: ["admin", "operator"],
          },
        );

        // Notify the user who owns the request
        if (requestOwnerId) {
          broadcastToUserAndAdmins(
            requestOwnerId,
            "PAYMENT_FAILED",
            {
              requestId: String(request._id),
              paymentId: String(payment._id),
              paymentStatus: "failed",
              failureReason: payment.failureReason,
              message: "Payment failed. Please try again.",
            },
            String(request._id),
          );
        }
      } else {
        console.error(
          "[Kashier Webhook] Request not found for failed payment:",
          payment.request,
        );
      }

      console.log(
        "[Kashier Webhook] Payment failed:",
        payment._id,
        payment.failureReason,
      );
    } else if (normalizedStatus === "pending") {
      // Payment still pending
      console.log(
        "[Kashier Webhook] Payment still pending, updating to 'processing'",
      );
      payment.status = "processing";
      await payment.save();
      console.log("[Kashier Webhook] Payment pending:", payment._id);
    } else {
      console.log(
        "[Kashier Webhook] Unknown payment status:",
        normalizedStatus,
      );
    }

    console.log("[Kashier Webhook] Webhook processing completed successfully");
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      paymentId: payment._id,
      status: payment.status,
    });
  } catch (error) {
    console.error("[Kashier Webhook] ERROR occurred:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const errorDetails =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined;

    if (errorDetails) {
      console.error("[Kashier Webhook] Error details:", errorDetails);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 },
    );
  }
}

// Kashier might also send GET requests for verification
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "active",
    message: "Kashier webhook endpoint is active",
  });
}
