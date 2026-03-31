import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment, Request, Wallet, Transaction } from "@/lib/models";
import { getKashierClient } from "@/lib/kashierClient";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * GET /api/pay/status/[paymentId]
 * 
 * Auto-check payment status by querying Kashier API directly
 * This is the REAL-TIME source of truth
 * Called automatically on page load and via polling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    console.log("[Payment Status Check] Starting auto-check for:", params.paymentId);

    await connectDB();

    // Get current user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find payment
    const payment = await Payment.findById(params.paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify user owns this payment
    if (payment.user.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    console.log("[Payment Status Check] Current DB status:", payment.status);

    // If already completed or failed, no need to check again
    if (payment.status === "completed" || payment.status === "failed") {
      console.log("[Payment Status Check] Payment already finalized:", payment.status);
      return NextResponse.json({
        success: true,
        status: payment.status,
        fromCache: true,
        needsUpdate: false,
      });
    }

    // Need sessionId to query Kashier — fall back to orderId-based lookup if missing
    if (!payment.kashierSessionId) {
      console.warn("[Payment Status Check] No kashierSessionId stored for payment:", payment._id);
      return NextResponse.json({
        success: false,
        error: "No Kashier session ID available for this payment",
        currentStatus: payment.status,
      }, { status: 400 });
    }

    // Query Kashier API for real-time status using session ID
    // Endpoint: GET /v3/payment/sessions/:sessionId/payment
    console.log("[Payment Status Check] Querying Kashier API with sessionId:", payment.kashierSessionId);
    const kashierClient = getKashierClient();
    const kashierStatus = await kashierClient.getPaymentStatus(payment.kashierSessionId);

    if (!kashierStatus.success) {
      console.error("[Payment Status Check] Failed to query Kashier:", kashierStatus.message);
      return NextResponse.json({
        success: false,
        error: "Failed to query payment status from Kashier",
        currentStatus: payment.status,
      }, { status: 500 });
    }

    const kashierPaymentStatus = kashierStatus.response?.status?.toUpperCase();
    console.log("[Payment Status Check] Kashier reports status:", kashierPaymentStatus);

    // Update database if status has changed
    let updated = false;

    if (kashierPaymentStatus === "SUCCESS" || kashierPaymentStatus === "CAPTURED" || kashierPaymentStatus === "PAID" || kashierPaymentStatus === "COMPLETED") {
      console.log("[Payment Status Check] Payment completed! Updating database...");
      
      // Update payment
      payment.status = "completed";
      payment.paidAt = new Date();
      payment.kashierTransactionId = kashierStatus.response?.orderId || payment.kashierTransactionId;
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
            description: `Partial payment for order ${payment.kashierOrderId}`,
            reference: `${payment.kashierOrderId}-WALLET`,
            request: payment.request,
            paymentGateway: {
              provider: "kashier",
              transactionId: kashierStatus.response?.orderId || payment.kashierOrderId,
              orderId: payment.kashierOrderId,
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
          description: `Payment of $${payment.amount} completed successfully (auto-verified)`,
          details: {
            paymentId: String(payment._id),
            transactionId: kashierStatus.response?.orderId || payment.kashierOrderId,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            verifiedVia: "auto-check",
          },
        };
        
        if (!req.activityHistory) {
          req.activityHistory = [];
        }
        req.activityHistory.push(activityEntry);

        await req.save();
        console.log("[Payment Status Check] Request updated to 'Assigned to Company'");
      }

      updated = true;

    } else if (kashierPaymentStatus === "FAILED" || kashierPaymentStatus === "DECLINED" || kashierPaymentStatus === "ERROR") {
      console.log("[Payment Status Check] Payment failed! Updating database...");
      
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = "Payment declined";
      await payment.save();

      // Update request
      const req = await Request.findById(payment.request);
      if (req) {
        req.paymentStatus = "failed";
        await req.save();
      }

      updated = true;

    } else if (kashierPaymentStatus === "PENDING" || kashierPaymentStatus === "PROCESSING") {
      console.log("[Payment Status Check] Payment still pending/processing");
      payment.status = "processing";
      await payment.save();
      updated = true;
    }

    console.log("[Payment Status Check] Update completed:", {
      updated,
      newStatus: payment.status,
    });

    return NextResponse.json({
      success: true,
      status: payment.status,
      kashierStatus: kashierPaymentStatus,
      updated,
      needsUpdate: kashierPaymentStatus === "PENDING" || kashierPaymentStatus === "PROCESSING",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Payment Status Check] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to check payment status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
