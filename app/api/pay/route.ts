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
    if (
      request.requestStatus !== "Assigned to Company" ||
      !request.selectedCompany
    ) {
      return NextResponse.json(
        { error: "Request is not ready for payment" },
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

    // Get the amount to pay (from selected company offer)
    // Cast to any to access potential finalPrice or fallback to cost
    const selectedCompany = request.selectedCompany as any;
    const totalAmount = selectedCompany.finalPrice || selectedCompany.cost || 0;

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
      currency: "USD",
      status: cardAmount > 0 ? "pending" : "processing",
      paymentMethod: cardAmount > 0 ? "card" : "wallet",
      kashierOrderId: orderId,
      breakdown: {
        shippingCost: totalAmount,
        walletDeduction: actualWalletAmount,
        cardAmount: cardAmount,
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
        currency: "USD",
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
      request.requestStatus = "In Progress";
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
    const currency = "USD";
    const hash = generateKashierHash(orderId, cardAmount, currency);

    const kashierPayload = {
      merchant_id: process.env.KASHIER_MERCHANT_ID,
      order_id: orderId,
      amount: cardAmount.toString(),
      currency: currency,
      hash: hash,
      mode: process.env.KASHIER_MODE || "test",
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment-result`,
      failure_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment-result?status=failed`,
      metadata: {
        userId: user.id,
        requestId: requestId,
        paymentId: String(payment._id),
        walletDeduction: actualWalletAmount,
      },
    };

    console.log("Kashier API Request:", {
      url: `${process.env.KASHIER_BASE_URL || "https://test-api.kashier.io"}/v3/payment/sessions`,
      merchantId: process.env.KASHIER_MERCHANT_ID,
      orderId,
      amount: cardAmount,
      currency,
      mode: process.env.KASHIER_MODE,
      authHeader: "Using SECRET_KEY (first 30 chars): " + process.env.KASHIER_SECRET_KEY?.substring(0, 30) + "...",
      payload: kashierPayload,
    });

    const response = await fetch(
      `${process.env.KASHIER_BASE_URL || "https://test-api.kashier.io"}/v3/payment/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: process.env.KASHIER_SECRET_KEY!,
          authMerchantId: process.env.KASHIER_MERCHANT_ID!,
        },
        body: JSON.stringify(kashierPayload),
      },
    );

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

    // Update payment with Kashier response
    payment.kashierPaymentUrl = data.response?.checkoutUrl || data.checkoutUrl;
    payment.kashierResponse = data;
    await payment.save();

    // Update request payment status
    request.paymentStatus = "pending";
    request.paymentId = payment._id;
    await request.save();

    return NextResponse.json({
      success: true,
      paymentUrl: data.response?.checkoutUrl || data.checkoutUrl,
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
