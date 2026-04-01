import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment, Request, Wallet, Transaction } from "@/lib/models";
import { getKashierClient } from "@/lib/kashierClient";
import {
  broadcastEvent,
  broadcastToUserAndAdmins,
} from "@/lib/eventBroadcaster";

/**
 * POST /api/pay/verify-redirect
 *
 * Called when user is redirected back from Kashier after payment
 * Verifies the actual payment status with Kashier and updates database
 * This is more reliable than waiting for webhooks (which may fail)
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Verify Redirect] Starting payment verification");

    await connectDB();

    const body = await request.json();
    const { orderId, paymentStatus: urlPaymentStatus } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    console.log("[Verify Redirect] Looking for payment with orderId:", orderId);
    console.log("[Verify Redirect] URL payment status:", urlPaymentStatus);

    // Find payment by Kashier order ID
    const payment = await Payment.findOne({ kashierOrderId: orderId });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    console.log("[Verify Redirect] Payment found:", {
      paymentId: payment._id,
      currentStatus: payment.status,
      amount: payment.amount,
    });

    // If already completed or failed, return immediately
    if (payment.status === "completed" || payment.status === "failed") {
      console.log(
        "[Verify Redirect] Payment already processed:",
        payment.status,
      );

      const req = await Request.findById(payment.request);
      return NextResponse.json({
        success: payment.status === "completed",
        message:
          payment.status === "completed"
            ? "Payment already confirmed"
            : "Payment already failed",
        paymentStatus: payment.status,
        requestId: req?.publicId || req?._id,
      });
    }

    // Query Kashier API for real-time status
    console.log("[Verify Redirect] Querying Kashier API for payment status...");

    let paymentStatus = "UNKNOWN";
    let kashierResponse: any = null;

    try {
      const kashierClient = getKashierClient();
      const kashierStatus = await kashierClient.getPaymentStatus(orderId);

      if (kashierStatus.success && kashierStatus.response) {
        paymentStatus =
          kashierStatus.response?.status?.toUpperCase() || "UNKNOWN";
        kashierResponse = kashierStatus.response;
        console.log(
          "[Verify Redirect] Kashier API reports status:",
          paymentStatus,
        );
      } else {
        console.warn(
          "[Verify Redirect] Kashier API query failed, falling back to URL parameter",
        );
        // If API query fails but URL says SUCCESS, trust the redirect
        if (
          urlPaymentStatus &&
          (urlPaymentStatus.toUpperCase() === "SUCCESS" ||
            urlPaymentStatus.toUpperCase() === "PAID")
        ) {
          paymentStatus = urlPaymentStatus.toUpperCase();
          console.log(
            "[Verify Redirect] Using URL payment status:",
            paymentStatus,
          );
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to verify payment with Kashier",
              message: "Please wait a moment and try again",
            },
            { status: 500 },
          );
        }
      }
    } catch (error) {
      console.error("[Verify Redirect] Exception querying Kashier:", error);
      // Fall back to URL parameter if provided
      if (
        urlPaymentStatus &&
        (urlPaymentStatus.toUpperCase() === "SUCCESS" ||
          urlPaymentStatus.toUpperCase() === "PAID")
      ) {
        paymentStatus = urlPaymentStatus.toUpperCase();
        console.log(
          "[Verify Redirect] Using URL payment status after exception:",
          paymentStatus,
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to verify payment with Kashier",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    }

    console.log("[Verify Redirect] Final payment status:", paymentStatus);

    // Update based on payment status
    if (
      paymentStatus === "SUCCESS" ||
      paymentStatus === "CAPTURED" ||
      paymentStatus === "PAID"
    ) {
      console.log("[Verify Redirect] Payment successful! Updating database...");

      // Update payment
      payment.status = "completed";
      payment.paidAt = new Date();
      payment.kashierTransactionId =
        kashierResponse?.transaction_id || payment.kashierTransactionId;
      payment.kashierResponse = {
        ...payment.kashierResponse,
        verificationResponse: kashierResponse,
      };
      await payment.save();

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
            currency: "EGP",
            description: `Partial payment for order ${orderId}`,
            reference: `${orderId}-WALLET`,
            request: payment.request,
            paymentGateway: {
              provider: "kashier",
              transactionId: kashierResponse?.transaction_id,
              orderId: orderId,
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

      // Update request
      const req: any = await Request.findById(payment.request);
      if (req) {
        req.paymentStatus = "paid";
        req.paidAmount = payment.amount;
        req.paidAt = new Date();
        req.requestStatus = "Assigned to Company";

        // Add activity to history
        const activityEntry = {
          timestamp: new Date(),
          action: "payment_completed",
          description: `Payment of ${payment.currency} ${payment.amount} completed successfully (verified on redirect)`,
          details: {
            paymentId: String(payment._id),
            transactionId: kashierResponse?.transaction_id,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            verifiedVia: "redirect",
          },
        };

        if (!req.activityHistory) {
          req.activityHistory = [];
        }
        req.activityHistory.push(activityEntry);

        await req.save();
        console.log(
          "[Verify Redirect] Request updated to 'Assigned to Company'",
        );

        // Broadcast real-time event
        const requestOwnerId = req.user?.toString() || String(req.user);
        console.log("[Verify Redirect] Broadcasting PAYMENT_COMPLETED event");

        broadcastEvent(
          "PAYMENT_COMPLETED",
          {
            requestId: String(req._id),
            paymentId: String(payment._id),
            amount: payment.amount,
            paymentStatus: "completed",
            requestStatus: req.requestStatus,
          },
          {
            requestId: String(req._id),
            targetRoles: ["admin", "operator"],
          },
        );

        if (requestOwnerId) {
          broadcastToUserAndAdmins(
            requestOwnerId,
            "PAYMENT_COMPLETED",
            {
              requestId: String(req._id),
              paymentId: String(payment._id),
              amount: payment.amount,
              paymentStatus: "completed",
              requestStatus: req.requestStatus,
              message:
                "Payment completed successfully! Your request has been submitted.",
            },
            String(req._id),
          );
        }

        return NextResponse.json({
          success: true,
          message: "Payment verified and completed successfully!",
          paymentStatus: "completed",
          requestId: req.publicId || req._id,
          requestStatus: req.requestStatus,
          amount: payment.amount,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Payment completed successfully!",
        paymentStatus: "completed",
        amount: payment.amount,
      });
    } else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "DECLINED" ||
      paymentStatus === "ERROR"
    ) {
      console.log("[Verify Redirect] Payment failed");

      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = "Payment declined or failed";
      await payment.save();

      // Update request
      const req = await Request.findById(payment.request);
      if (req) {
        req.paymentStatus = "failed";
        await req.save();

        // Broadcast failure event
        const requestOwnerId = req.user?.toString() || String(req.user);

        broadcastEvent(
          "PAYMENT_FAILED",
          {
            requestId: String(req._id),
            paymentId: String(payment._id),
            paymentStatus: "failed",
            failureReason: payment.failureReason,
          },
          {
            requestId: String(req._id),
            targetRoles: ["admin", "operator"],
          },
        );

        if (requestOwnerId) {
          broadcastToUserAndAdmins(
            requestOwnerId,
            "PAYMENT_FAILED",
            {
              requestId: String(req._id),
              paymentId: String(payment._id),
              paymentStatus: "failed",
              failureReason: payment.failureReason,
              message: "Payment failed. Please try again.",
            },
            String(req._id),
          );
        }
      }

      return NextResponse.json({
        success: false,
        message: "Payment was declined or failed",
        paymentStatus: "failed",
        error: "Payment failed",
      });
    } else {
      console.log("[Verify Redirect] Payment still pending/processing");

      payment.status = "processing";
      await payment.save();

      return NextResponse.json({
        success: false,
        message:
          "Payment is still being processed. Please wait a moment and check again.",
        paymentStatus: "processing",
      });
    }
  } catch (error) {
    console.error("[Verify Redirect] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
