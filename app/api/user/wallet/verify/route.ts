import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getKashierClient } from "@/lib/kashierClient";

/**
 * POST /api/user/wallet/verify
 *
 * Called when the user is redirected back from Kashier after a topup payment.
 * Verifies the actual payment status with Kashier API and updates the
 * transaction + wallet balance accordingly.
 *
 * This is the reliable fallback for when the server webhook is not reachable
 * (e.g. in development, or if Kashier's webhook delivery fails).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    // Only allow topup orders
    if (!orderId.startsWith("TOPUP-")) {
      return NextResponse.json(
        { error: "Invalid order type" },
        { status: 400 },
      );
    }

    // Find the transaction
    const transaction = await Transaction.findOne({
      reference: orderId,
      user: user.id,
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // If already processed, just return the current state
    if (transaction.status === "completed") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        status: "completed",
        amount: transaction.amount,
        currency: transaction.currency,
      });
    }

    if (transaction.status === "failed") {
      return NextResponse.json({
        success: false,
        alreadyProcessed: true,
        status: "failed",
      });
    }

    // Query Kashier for the real status using the session ID stored in the transaction
    const sessionId = transaction.paymentGateway?.transactionId;
    if (!sessionId) {
      return NextResponse.json(
        { error: "No Kashier session ID found for this transaction" },
        { status: 400 },
      );
    }

    console.log(
      "[WalletVerify] Querying Kashier for session:",
      sessionId,
      "orderId:",
      orderId,
    );

    let paymentStatus = "UNKNOWN";

    try {
      const kashierClient = getKashierClient();
      const result = await kashierClient.getPaymentStatus(sessionId);

      if (result.success && result.response?.status) {
        paymentStatus = result.response.status.toUpperCase();
        console.log("[WalletVerify] Kashier status:", paymentStatus);
      } else {
        console.warn(
          "[WalletVerify] Could not retrieve Kashier status:",
          result.message,
        );
        return NextResponse.json({
          success: false,
          pending: true,
          message:
            "Could not verify payment status yet. Please wait a moment and refresh.",
        });
      }
    } catch (err) {
      console.error("[WalletVerify] Kashier API error:", err);
      return NextResponse.json({
        success: false,
        pending: true,
        message: "Payment verification failed. Please try again shortly.",
      });
    }

    const isSuccess =
      paymentStatus === "SUCCESS" ||
      paymentStatus === "CAPTURED" ||
      paymentStatus === "PAID";
    const isFailed =
      paymentStatus === "FAILED" ||
      paymentStatus === "DECLINED" ||
      paymentStatus === "ERROR";

    if (isSuccess) {
      // Credit the wallet atomically
      const wallet = await Wallet.findOneAndUpdate(
        { user: user.id, status: "active" },
        {
          $inc: {
            balance: transaction.amount,
            totalCredits: transaction.amount,
          },
          $set: { lastTransactionAt: new Date() },
        },
        { new: true },
      );

      if (!wallet) {
        console.error(
          "[WalletVerify] Wallet not found or not active:",
          user.id,
        );
        return NextResponse.json(
          { error: "Wallet not found or is not active" },
          { status: 400 },
        );
      }

      const balanceBefore = wallet.balance - transaction.amount;

      transaction.status = "completed";
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = wallet.balance;
      transaction.paymentGateway = {
        ...transaction.paymentGateway,
        status: "success",
      };
      await transaction.save();

      console.log(
        `[WalletVerify] Topup confirmed: ${transaction.amount} ${transaction.currency} added to wallet`,
      );

      return NextResponse.json({
        success: true,
        status: "completed",
        amount: transaction.amount,
        currency: transaction.currency,
        newBalance: wallet.balance,
      });
    }

    if (isFailed) {
      transaction.status = "failed";
      transaction.paymentGateway = {
        ...transaction.paymentGateway,
        status: "failed",
      };
      await transaction.save();

      return NextResponse.json({
        success: false,
        status: "failed",
        message: "Payment was declined or failed",
      });
    }

    // Still pending (e.g. payment in progress)
    return NextResponse.json({
      success: false,
      pending: true,
      status: paymentStatus,
      message: "Payment is still being processed",
    });
  } catch (error) {
    console.error("[WalletVerify] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
