import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

// Get transaction history with pagination
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const type = searchParams.get("type"); // filter by transaction type
    const status = searchParams.get("status"); // filter by status

    // Build query
    const query: any = { user: user.id };
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await Transaction.countDocuments(query);

    // Get transactions with pagination
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("request", "publicId")
      .lean();

    return NextResponse.json({
      transactions: transactions.map((t: any) => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        reference: t.reference,
        status: t.status,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        request: t.request
          ? {
              id: t.request._id,
              publicId: t.request.publicId,
            }
          : null,
        paymentGateway: t.paymentGateway,
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
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
