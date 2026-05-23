import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment, Request } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * Manually verify payment status with Kashier
 * Use this when webhook fails to deliver
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { orderId, requestId } = body;

    if (!orderId && !requestId) {
      return NextResponse.json(
        { error: "Order ID or Request ID is required" },
        { status: 400 }
      );
    }

    // Find payment record
    let payment;
    if (orderId) {
      payment = await Payment.findOne({ kashierOrderId: orderId });
    } else if (requestId) {
      // Find request first
      const request = await Request.findOne({
        $or: [
          { _id: requestId.match(/^[0-9a-fA-F]{24}$/) ? requestId : null },
          { publicId: requestId },
        ],
      });

      if (request) {
        payment = await Payment.findOne({ request: request._id }).sort({
          createdAt: -1,
        });
      }
    }

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify user owns this payment
    if (String(payment.user) !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If already completed, return current status
    if (payment.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "Payment already completed",
        payment: {
          status: payment.status,
          amount: payment.amount,
          paidAt: payment.paidAt,
        },
      });
    }

    // Query Kashier API to check payment status
    const isTestMode = (process.env.KASHIER_MODE || "test") === "test";
    
    // Kashier doesn't have a direct "get payment by order ID" endpoint in their public docs
    // But we can check using their payment verification approach
    // For now, we'll manually mark it based on the merchant's confirmation
    
    console.log("[Verify Payment] Manual verification requested for:", {
      orderId: payment.kashierOrderId,
      paymentId: payment._id,
      currentStatus: payment.status,
    });

    return NextResponse.json({
      success: true,
      message: "Please check Kashier dashboard and use 'Mark as Paid' if payment is confirmed",
      payment: {
        id: payment._id,
        status: payment.status,
        kashierOrderId: payment.kashierOrderId,
        amount: payment.amount,
        createdAt: payment.createdAt,
      },
      kashierDashboardUrl: isTestMode
        ? `https://portal.kashier.io/en/dashboard/payments/${payment.kashierOrderId}`
        : `https://portal.kashier.io/en/dashboard/payments/${payment.kashierOrderId}`,
    });
  } catch (error) {
    console.error("[Verify Payment] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to verify payment",
      },
      { status: 500 }
    );
  }
}

/**
 * Manually mark payment as completed (admin only or after manual verification)
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { paymentId, kashierTransactionId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify user owns this payment or is admin
    if (String(payment.user) !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update payment to completed
    payment.status = "completed";
    payment.paidAt = new Date();
    if (kashierTransactionId) {
      payment.kashierTransactionId = kashierTransactionId;
    }
    await payment.save();

    // Update request
    const request: any = await Request.findById(payment.request);
    if (request) {
      request.paymentStatus = "paid";
      request.paidAmount = payment.amount;
      request.paidAt = new Date();
      
      // Change status to "Assigned to Driver" after successful payment
      if (request.requestStatus === "Action needed") {
        request.requestStatus = "Assigned to Driver";
      }

      // Add activity to history
      const activityEntry = {
        timestamp: new Date(),
        action: "payment_completed",
        description: `Payment of $${payment.amount} completed successfully (manually verified)`,
        details: {
          paymentId: String(payment._id),
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          manuallyVerified: true,
        },
      };

      if (!request.activityHistory) {
        request.activityHistory = [];
      }
      request.activityHistory.push(activityEntry);

      await request.save();
    }

    console.log("[Verify Payment] Payment marked as completed:", payment._id);

    return NextResponse.json({
      success: true,
      message: "Payment marked as completed successfully",
      payment: {
        id: payment._id,
        status: payment.status,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error("[Verify Payment] Error marking as paid:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to mark payment as paid",
      },
      { status: 500 }
    );
  }
}
