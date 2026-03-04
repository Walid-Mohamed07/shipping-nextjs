import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Payment, Request, Wallet, Transaction } from "@/lib/models";

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
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    console.log("Kashier webhook received:", JSON.stringify(payload, null, 2));

    // Verify signature if provided
    const signature = payload.signature || req.headers.get("x-kashier-signature");
    if (signature && process.env.KASHIER_SECRET_KEY) {
      const isValid = verifyKashierSignature(payload, signature);
      if (!isValid) {
        console.error("Invalid Kashier webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const {
      orderId,
      merchantOrderId,
      transactionId,
      amount,
      currency,
      paymentStatus,
      metaData,
    } = payload;

    const orderRef = orderId || merchantOrderId;
    if (!orderRef) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Find the payment record
    const payment = await Payment.findOne({ kashierOrderId: orderRef });
    if (!payment) {
      console.error("Payment not found for order:", orderRef);
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Prevent duplicate processing
    if (payment.status === "completed" || payment.status === "failed") {
      console.log("Payment already processed:", payment._id);
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

    if (normalizedStatus === "success" || normalizedStatus === "captured") {
      // Payment successful
      payment.status = "completed";
      payment.paidAt = new Date();
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
      const request: any = await Request.findById(payment.request);
      if (request) {
        request.paymentStatus = "paid";
        request.paidAmount = payment.amount;
        request.paidAt = new Date();
        request.requestStatus = "In Progress";

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
      }

      console.log("Payment completed successfully:", payment._id);

    } else if (
      normalizedStatus === "failed" ||
      normalizedStatus === "declined" ||
      normalizedStatus === "error"
    ) {
      // Payment failed
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = payload.failureReason || payload.message || "Payment declined";
      await payment.save();

      // Update request
      const request = await Request.findById(payment.request);
      if (request) {
        request.paymentStatus = "failed";
        await request.save();
      }

      console.log("Payment failed:", payment._id, payment.failureReason);

    } else if (normalizedStatus === "pending") {
      // Payment still pending
      payment.status = "processing";
      await payment.save();
      console.log("Payment pending:", payment._id);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      paymentId: payment._id,
      status: payment.status,
    });
  } catch (error) {
    console.error("Kashier webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorDetails = process.env.NODE_ENV === "development" && error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
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
