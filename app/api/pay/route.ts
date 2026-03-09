import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Payment, Request, Wallet, Transaction } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

// Generate Kashier hash for secure payment
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

// Create payment session with Kashier
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { requestId, paymentMethod, useWallet, walletAmount = 0 } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 },
      );
    }

    // Get the request and validate (requestId can be _id or publicId)
    const request = await Request.findOne({
      $or: [
        { _id: requestId.match(/^[0-9a-fA-F]{24}$/) ? requestId : null },
        { publicId: requestId },
      ],
    });
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify user owns this request
    const requestUserId = String(request.user);
    if (requestUserId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized to pay for this request" },
        { status: 403 },
      );
    }

    // Check if request is in correct status for payment
    // Allow payment when status is "Action needed" and an offer has been selected
    const canPay =
      (request.requestStatus === "Action needed" ||
        request.requestStatus === "Assigned to Company") &&
      request.selectedCompany;

    if (!canPay) {
      return NextResponse.json(
        {
          error:
            "Request is not ready for payment. Please select an offer first.",
        },
        { status: 400 },
      );
    }

    // Check if already paid
    if (request.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Request is already paid" },
        { status: 400 },
      );
    }

    // Get the amount to pay
    // IMPORTANT: Use locked price if available (to prevent exchange rate fluctuation issues)
    // Priority: lockedPrice > selectedCompany.finalPrice > selectedCompany.cost
    const pricing = request.pricing as any;
    const selectedCompany = request.selectedCompany as any;

    let totalAmount: number;
    let paymentCurrency: string;

    if (pricing?.finalLockedPrice || pricing?.lockedPrice) {
      // Use locked price - this was set when the client accepted the offer
      totalAmount = pricing.finalLockedPrice || pricing.lockedPrice;
      paymentCurrency = pricing.clientCurrency || "USD";
      console.log(
        "[Payment] Using locked price:",
        totalAmount,
        paymentCurrency,
      );
    } else {
      // Fallback to selected company price (for backwards compatibility)
      totalAmount = selectedCompany.finalPrice || selectedCompany.cost || 0;
      paymentCurrency = selectedCompany.currency || "USD";
      console.log(
        "[Payment] Using selectedCompany price (no locked price):",
        totalAmount,
        paymentCurrency,
      );
    }

    // Get user wallet if using wallet
    let wallet = null;
    let actualWalletAmount = 0;
    if (useWallet) {
      wallet = await Wallet.findOne({ user: user.id });
      if (wallet && wallet.status === "active") {
        actualWalletAmount = Math.min(
          walletAmount,
          wallet.balance,
          totalAmount,
        );
      }
    }

    const cardAmount = totalAmount - actualWalletAmount;

    // Generate unique order ID
    const orderId = `PAY-${request.publicId || requestId.slice(-8).toUpperCase()}-${Date.now()}`;

    // Create payment record
    const payment = await Payment.create({
      user: user.id,
      request: request._id,
      amount: totalAmount,
      currency: paymentCurrency,
      status: cardAmount > 0 ? "pending" : "processing",
      paymentMethod: cardAmount > 0 ? "card" : "wallet",
      kashierOrderId: orderId,
      breakdown: {
        shippingCost: totalAmount,
        walletDeduction: actualWalletAmount,
        cardAmount: cardAmount,
      },
      // Store locked price metadata for audit trail
      metadata: {
        isLockedPrice: !!pricing?.lockedPrice,
        basePrice: pricing?.basePrice,
        baseCurrency: pricing?.baseCurrency,
        exchangeRateAtAcceptance: pricing?.exchangeRateAtAcceptance,
        lockedAt: pricing?.lockedAt,
      },
      ipAddress:
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    // If fully paid by wallet
    if (cardAmount <= 0 && actualWalletAmount > 0) {
      // Deduct from wallet
      const balanceBefore = wallet.balance;
      wallet.balance -= actualWalletAmount;
      wallet.totalDebits += actualWalletAmount;
      wallet.lastTransactionAt = new Date();
      await wallet.save();

      // Create wallet transaction
      const transaction = await Transaction.create({
        user: user.id,
        type: "payment",
        amount: actualWalletAmount,
        currency: paymentCurrency,
        description: `Payment for shipping request ${request.publicId || requestId}`,
        reference: orderId,
        request: request._id,
        status: "completed",
        balanceBefore,
        balanceAfter: wallet.balance,
      });

      // Update payment and request
      payment.status = "completed";
      payment.walletTransactionId = transaction._id;
      payment.paidAt = new Date();
      await payment.save();

      request.paymentStatus = "paid";
      request.paymentId = payment._id;
      request.paidAmount = totalAmount;
      request.paidAt = new Date();
      // Change status to "Assigned to Company" after successful payment
      request.requestStatus = "Assigned to Company";
      await request.save();

      return NextResponse.json({
        success: true,
        message: "Payment completed via wallet",
        payment: {
          id: payment._id,
          status: "completed",
          amount: totalAmount,
          walletDeduction: actualWalletAmount,
        },
      });
    }

    // Create Kashier payment session for card payment
    const currency = paymentCurrency; // Kashier primarily uses EGP
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const isTestMode = (process.env.KASHIER_MODE || "test") === "test";

    // Set expiration to 1 hour from now
    const expireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Kashier API payload based on official documentation
    // https://developers.kashier.io/payment/payment-sessions
    const kashierPayload = {
      merchantId: process.env.KASHIER_MERCHANT_ID,
      expireAt: expireAt,
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: String(cardAmount.toFixed(2)),
      currency: currency,
      order: orderId,
      merchantRedirect: encodeURI(
        `${baseUrl}/payment-result?orderId=${orderId}`,
      ),
      serverWebhook: `${baseUrl}/api/pay/webhook`,
      display: "en",
      type: "one-time",
      allowedMethods: "card",
      customer: {
        email: user.email || `user${user.id}@placeholder.com`,
        reference: user.id,
      },
      metaData: {
        userId: user.id,
        requestId: requestId,
        paymentId: String(payment._id),
        walletDeduction: actualWalletAmount,
      },
    };

    // Kashier API URLs per documentation:
    // TEST: https://test-api.kashier.io/v3/payment/sessions
    // LIVE: https://api.kashier.io/v3/payment/sessions
    const apiUrl = isTestMode
      ? "https://test-api.kashier.io/v3/payment/sessions"
      : "https://api.kashier.io/v3/payment/sessions";

    console.log("Kashier API Request:", {
      url: apiUrl,
      merchantId: process.env.KASHIER_MERCHANT_ID,
      orderId,
      amount: kashierPayload.amount,
      currency,
      expireAt: expireAt,
    });
    console.log("Kashier Headers:", {
      Authorization: `${process.env.KASHIER_SECRET_KEY?.substring(0, 20)}...`,
      "api-key": `${process.env.KASHIER_API_KEY?.substring(0, 20)}...`,
    });
    console.log("Kashier Payload:", JSON.stringify(kashierPayload, null, 2));

    // Headers per Kashier documentation:
    // Authorization: secret_key
    // api-key: api_key
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.KASHIER_SECRET_KEY!,
        "api-key": process.env.KASHIER_API_KEY!,
      },
      body: JSON.stringify(kashierPayload),
    });

    // Log response for debugging
    console.log("Kashier API Response Status:", response.status);
    console.log(
      "Kashier API Response Headers:",
      Object.fromEntries(response.headers.entries()),
    );

    // Try to parse JSON, but handle HTML error responses
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = await response.json();
      console.log("Kashier API Response Data:", JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(
        "Kashier API returned non-JSON response:",
        text.substring(0, 500),
      );

      payment.status = "failed";
      payment.failureReason = `Kashier API error: Invalid response format (${response.status})`;
      await payment.save();

      return NextResponse.json(
        {
          error: "Payment gateway configuration error",
          details:
            process.env.NODE_ENV === "development"
              ? `Kashier returned HTML instead of JSON. Status: ${response.status}. Check API credentials and endpoint.`
              : undefined,
        },
        { status: 500 },
      );
    }

    if (!response.ok || data.error) {
      payment.status = "failed";
      payment.failureReason =
        data.error?.message ||
        data.message ||
        "Failed to create payment session";
      await payment.save();

      return NextResponse.json(
        {
          error:
            data.error?.message ||
            data.message ||
            "Failed to create payment session",
          details: process.env.NODE_ENV === "development" ? data : undefined,
        },
        { status: 400 },
      );
    }

    // Extract sessionUrl from Kashier response
    // Per Kashier docs: sessionUrl is the URL for the payment page
    // Can be used as: <iframe src="sessionUrl">
    // Or redirect user directly to it
    const sessionId = data._id;
    const sessionUrl = data.sessionUrl;
    const paymentUrl =
      sessionUrl ||
      `https://payments.kashier.io/session/${sessionId}?mode=${isTestMode ? "test" : "live"}`;

    console.log("Kashier Session Created:", {
      sessionId,
      sessionUrl,
      paymentUrl,
      status: data.status,
    });

    payment.kashierPaymentUrl = paymentUrl;
    payment.kashierSessionId = sessionId;
    payment.kashierResponse = data;
    await payment.save();

    // Update request payment status
    request.paymentStatus = "pending";
    request.paymentId = payment._id;
    await request.save();

    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl,
      payment: {
        id: payment._id,
        orderId: orderId,
        amount: totalAmount,
        cardAmount: cardAmount,
        walletDeduction: actualWalletAmount,
      },
    });
  } catch (error) {
    console.error("Payment error:", error);
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

// Get payment status
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    const requestId = searchParams.get("requestId");

    let payment;
    if (paymentId) {
      payment = await Payment.findById(paymentId);
    } else if (requestId) {
      // requestId can be _id or publicId, need to resolve to actual request
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
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify access
    if (String(payment.user) !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        breakdown: payment.breakdown,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Get payment error:", error);
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
