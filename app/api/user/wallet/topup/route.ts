import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

// Generate Kashier hash
function generateKashierHash(
  orderId: string,
  amount: number,
  currency: string
): string {
  const secretKey = process.env.KASHIER_SECRET_KEY || "";
  const merchantId = process.env.KASHIER_MERCHANT_ID || "";
  const dataToHash = `${merchantId}${orderId}${amount}${currency}`;
  return crypto.createHmac("sha256", secretKey).update(dataToHash).digest("hex");
}

// Initiate wallet topup
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { amount } = body;

    // Validate amount
    if (!amount || typeof amount !== "number" || amount < 1) {
      return NextResponse.json(
        { error: "Amount must be at least $1" },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: "Maximum topup amount is $10,000" },
        { status: 400 }
      );
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ user: user.id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: user.id,
        balance: 0,
        currency: "USD",
        status: "active",
      });
    }

    if (wallet.status !== "active") {
      return NextResponse.json(
        { error: "Wallet is not active" },
        { status: 400 }
      );
    }

    // Generate unique order ID for topup
    const orderId = `TOPUP-${user.id.slice(-6).toUpperCase()}-${Date.now()}`;
    const currency = "USD";

    // Create pending transaction
    const transaction = await Transaction.create({
      user: user.id,
      type: "topup",
      amount: amount,
      currency: currency,
      description: `Wallet topup: $${amount}`,
      reference: orderId,
      status: "pending",
      balanceBefore: wallet.balance,
    });

    // Create Kashier payment session
    const hash = generateKashierHash(orderId, amount, currency);

    const kashierPayload = {
      merchantId: process.env.KASHIER_MERCHANT_ID,
      orderId: orderId,
      amount: amount,
      currency: currency,
      hash: hash,
      mode: process.env.KASHIER_MODE || "test",
      metaData: {
        userId: user.id,
        transactionId: String(transaction._id),
        type: "wallet_topup",
      },
      customerReference: user.id,
      display: {
        redirectionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/wallet?topup=success`,
        failureUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/wallet?topup=failed`,
      },
    };

    const response = await fetch(
      `${process.env.KASHIER_BASE_URL || "https://checkout.kashier.io"}/api/v3/payments/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.KASHIER_API_KEY!,
        },
        body: JSON.stringify(kashierPayload),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      // Mark transaction as failed
      transaction.status = "failed";
      await transaction.save();

      return NextResponse.json(
        { error: data.error?.message || "Failed to create payment session" },
        { status: 400 }
      );
    }

    // Update transaction with payment gateway info
    transaction.paymentGateway = {
      provider: "kashier",
      transactionId: "",
      orderId: orderId,
      status: "pending",
    };
    await transaction.save();

    return NextResponse.json({
      success: true,
      paymentUrl: data.response?.checkoutUrl || data.checkoutUrl,
      transaction: {
        id: transaction._id,
        orderId: orderId,
        amount: amount,
      },
    });
  } catch (error) {
    console.error("Wallet topup error:", error);
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
