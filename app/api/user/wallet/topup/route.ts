import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";
import { convertCurrency } from "@/lib/currencyService";
import { SUPPORTED_CURRENCIES, BASE_CURRENCY } from "@/constants/currencies";

// Generate Kashier hash
function generateKashierHash(
  orderId: string,
  amount: number,
  currency: string,
): string {
  const secretKey = process.env.KASHIER_SECRET_KEY || "";
  const merchantId = process.env.KASHIER_MERCHANT_ID || "";
  const dataToHash = `${merchantId}${orderId}${amount}${currency}`;
  return crypto
    .createHmac("sha256", secretKey)
    .update(dataToHash)
    .digest("hex");
}

// Initiate wallet topup
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { amount, currency: inputCurrency } = body;

    // Validate and normalize the input currency
    const userCurrency =
      inputCurrency &&
      SUPPORTED_CURRENCIES.includes(inputCurrency.toUpperCase())
        ? inputCurrency.toUpperCase()
        : BASE_CURRENCY;

    // Validate amount
    if (!amount || typeof amount !== "number" || amount < 1) {
      return NextResponse.json(
        { error: "Amount must be at least 1" },
        { status: 400 },
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: "Maximum topup amount exceeded" },
        { status: 400 },
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
        { status: 400 },
      );
    }

    // Generate unique order ID for topup
    const orderId = `TOPUP-${user.id.slice(-6).toUpperCase()}-${Date.now()}`;
    const gatewayCurrency = "EGP"; // Kashier primarily uses EGP

    // Convert user's input amount to USD (wallet base currency) and EGP (gateway currency)
    let amountInUSD = amount;
    let amountInGateway = amount;
    let exchangeRateToUSD = 1;
    let exchangeRateToGateway = 1;

    if (userCurrency !== BASE_CURRENCY) {
      const toUSD = await convertCurrency(amount, userCurrency, BASE_CURRENCY);
      amountInUSD = toUSD.amount;
      exchangeRateToUSD = toUSD.rate;
    }

    if (userCurrency !== gatewayCurrency) {
      const toGateway = await convertCurrency(
        amount,
        userCurrency,
        gatewayCurrency,
      );
      amountInGateway = toGateway.amount;
      exchangeRateToGateway = toGateway.rate;
    } else {
      amountInGateway = amount;
    }

    // Create pending transaction (store the USD amount that will be added to wallet)
    const transaction = await Transaction.create({
      user: user.id,
      type: "topup",
      amount: amountInUSD,
      currency: BASE_CURRENCY,
      description: `Wallet topup: ${amount} ${userCurrency}`,
      reference: orderId,
      status: "pending",
      balanceBefore: wallet.balance,
      metadata: {
        inputAmount: amount,
        inputCurrency: userCurrency,
        gatewayAmount: amountInGateway,
        gatewayCurrency: gatewayCurrency,
        exchangeRateToUSD,
        exchangeRateToGateway,
      },
    });

    // Create Kashier payment session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const isTestMode = (process.env.KASHIER_MODE || "test") === "test";

    // Set expiration to 1 hour from now
    const expireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Kashier API payload per official documentation
    // https://developers.kashier.io/payment/payment-sessions
    const kashierPayload = {
      merchantId: process.env.KASHIER_MERCHANT_ID,
      expireAt: expireAt,
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: String(amountInGateway.toFixed(2)),
      currency: gatewayCurrency,
      order: orderId,
      merchantRedirect: encodeURI(
        `${baseUrl}/wallet?topup=success&orderId=${orderId}`,
      ),
      serverWebhook: `${baseUrl}/api/user/wallet/webhook`,
      display: "en",
      type: "one-time",
      allowedMethods: "card",
      customer: {
        email: user.email || `user${user.id}@placeholder.com`,
        reference: user.id,
      },
      metaData: {
        userId: user.id,
        transactionId: String(transaction._id),
        type: "wallet_topup",
      },
    };

    // Kashier API URLs per documentation
    const apiUrl = isTestMode
      ? "https://test-api.kashier.io/v3/payment/sessions"
      : "https://api.kashier.io/v3/payment/sessions";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.KASHIER_SECRET_KEY!,
        "api-key": process.env.KASHIER_API_KEY!,
      },
      body: JSON.stringify(kashierPayload),
    });

    // Handle non-JSON responses
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.log(
        "Kashier Topup API returned non-JSON:",
        text.substring(0, 500),
      );

      transaction.status = "failed";
      await transaction.save();

      return NextResponse.json(
        { error: "Payment gateway configuration error" },
        { status: 500 },
      );
    }

    console.log("Kashier Topup Response:", { status: response.status, data });

    if (!response.ok || data.error) {
      // Mark transaction as failed
      transaction.status = "failed";
      await transaction.save();

      return NextResponse.json(
        {
          error:
            data.error?.message ||
            data.message ||
            "Failed to create payment session",
        },
        { status: 400 },
      );
    }

    // Extract sessionUrl from Kashier response
    const sessionId = data._id;
    const sessionUrl = data.sessionUrl;
    const paymentUrl =
      sessionUrl ||
      `https://payments.kashier.io/session/${sessionId}?mode=${isTestMode ? "test" : "live"}`;

    // Update transaction with payment gateway info
    transaction.paymentGateway = {
      provider: "kashier",
      transactionId: sessionId || "",
      orderId: orderId,
      status: "pending",
    };
    await transaction.save();

    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl,
      transaction: {
        id: transaction._id,
        orderId: orderId,
        amount: amountInUSD,
        inputAmount: amount,
        inputCurrency: userCurrency,
        gatewayAmount: amountInGateway,
        gatewayCurrency: gatewayCurrency,
      },
    });
  } catch (error) {
    console.error("Wallet topup error:", error);
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
