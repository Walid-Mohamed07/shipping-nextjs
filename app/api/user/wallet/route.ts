import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

// Get user wallet
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find or create wallet
    let wallet = await Wallet.findOne({ user: user.id });

    if (!wallet) {
      wallet = await Wallet.create({
        user: user.id,
        balance: 0,
        currency: "USD",
        status: "active",
        totalCredits: 0,
        totalDebits: 0,
      });
    }

    // Get recent transactions
    const transactions = await Transaction.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      wallet: {
        id: wallet._id,
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
        totalCredits: wallet.totalCredits,
        totalDebits: wallet.totalDebits,
        lastTransactionAt: wallet.lastTransactionAt,
      },
      recentTransactions: transactions.map((t: any) => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get wallet error:", error);
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

// Admin: Update wallet balance (for testing/manual adjustments)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin only" },
        { status: 401 },
      );
    }

    await connectDB();

    const body = await req.json();
    const { userId, amount, type, description } = body;

    if (!userId || typeof amount !== "number" || !type) {
      return NextResponse.json(
        { error: "userId, amount, and type are required" },
        { status: 400 },
      );
    }

    // Amount is in USD (wallet base currency)
    const amountInUSD = amount;

    // Find or create wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        currency: "USD",
        status: "active",
      });
    }

    if (type === "credit") {
      wallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id },
        {
          $inc: { balance: amountInUSD, totalCredits: amountInUSD },
          $set: { lastTransactionAt: new Date() },
        },
        { new: true },
      );
    } else if (type === "debit") {
      wallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: amountInUSD } },
        {
          $inc: { balance: -amountInUSD, totalDebits: amountInUSD },
          $set: { lastTransactionAt: new Date() },
        },
        { new: true },
      );
      if (!wallet) {
        return NextResponse.json(
          { error: "Insufficient wallet balance" },
          { status: 400 },
        );
      }
    }

    const balanceBefore =
      type === "credit"
        ? wallet!.balance - amountInUSD
        : wallet!.balance + amountInUSD;

    // Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      type: type,
      amount: amountInUSD,
      currency: "USD",
      description: description || `Admin ${type}: $${amount}`,
      reference: `ADMIN-${Date.now()}`,
      status: "completed",
      balanceBefore,
      balanceAfter: wallet!.balance,
      metadata: {
        adminId: user.id,
        adminEmail: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet!._id,
        balance: wallet!.balance,
      },
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
      },
    });
  } catch (error) {
    console.error("Update wallet error:", error);
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
