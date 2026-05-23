import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";

// Verify Kashier webhook signature
function verifyKashierSignature(payload: any, signature: string): boolean {
  const secretKey = process.env.KASHIER_SECRET_KEY || "";
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
        { status: 400 },
      );
    }

    console.log(
      "Wallet topup webhook received:",
      JSON.stringify(payload, null, 2),
    );

    // Verify signature
    const signature =
      payload.signature || req.headers.get("x-kashier-signature");
    if (signature && process.env.KASHIER_SECRET_KEY) {
      const isValid = verifyKashierSignature(payload, signature);
      if (!isValid) {
        console.error("Invalid Kashier webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    const {
      orderId,
      merchantOrderId,
      transactionId,
      amount,
      paymentStatus,
      metaData,
    } = payload;

    const orderRef = orderId || merchantOrderId;

    // Check if this is a wallet topup
    if (!orderRef?.startsWith("TOPUP-")) {
      // Not a topup transaction, let it pass to the general webhook
      return NextResponse.json({
        success: true,
        message: "Not a topup transaction",
      });
    }

    // Find the transaction
    const transaction = await Transaction.findOne({ reference: orderRef });
    if (!transaction) {
      console.error("Transaction not found for order:", orderRef);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Prevent duplicate processing
    if (transaction.status === "completed" || transaction.status === "failed") {
      console.log("Transaction already processed:", transaction._id);
      return NextResponse.json({
        success: true,
        message: "Transaction already processed",
      });
    }

    const normalizedStatus = paymentStatus?.toLowerCase();

    if (normalizedStatus === "success" || normalizedStatus === "captured") {
      // Payment successful - add funds to wallet atomically
      const wallet = await Wallet.findOneAndUpdate(
        { user: transaction.user, status: "active" },
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
          "Wallet not found or not active for user:",
          transaction.user,
        );
        return NextResponse.json(
          { error: "Wallet not found or not active" },
          { status: 404 },
        );
      }

      const balanceBefore = wallet.balance - transaction.amount;

      // Update transaction
      transaction.status = "completed";
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = wallet.balance;
      transaction.paymentGateway = {
        provider: "kashier",
        transactionId: transactionId,
        orderId: orderRef,
        status: "success",
      };
      await transaction.save();

      console.log(
        `Wallet topup successful: ${transaction.amount} ${transaction.currency} added to wallet ${wallet._id}`,
      );
    } else if (
      normalizedStatus === "failed" ||
      normalizedStatus === "declined" ||
      normalizedStatus === "error"
    ) {
      // Payment failed
      transaction.status = "failed";
      transaction.paymentGateway = {
        provider: "kashier",
        transactionId: transactionId || "",
        orderId: orderRef,
        status: "failed",
      };
      await transaction.save();

      console.log("Wallet topup failed:", transaction._id);
    }

    return NextResponse.json({
      success: true,
      message: "Topup webhook processed successfully",
      transactionId: transaction._id,
      status: transaction.status,
    });
  } catch (error) {
    console.error("Wallet topup webhook error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const errorDetails =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 },
    );
  }
}
