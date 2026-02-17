import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, companyId, userId } = body;

    if (!requestId || !companyId) {
      return NextResponse.json(
        { error: "requestId and companyId are required" },
        { status: 400 },
      );
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        assignedCompanyId: companyId,
        requestStatus: "Assigned to Company",
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Offer accepted successfully",
        request: updatedRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
