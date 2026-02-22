import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, companyId, userId, companyName, companyRate } = body;

    if (!requestId || !companyId) {
      return NextResponse.json(
        { error: "requestId and companyId are required" },
        { status: 400 },
      );
    }

    // Get current request to find offer cost
    const currentRequest = await Request.findById(requestId);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const selectedOffer = currentRequest.costOffers?.find(
      (offer: any) => offer.company?.id === companyId,
    );
    const cost = selectedOffer?.cost;

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        assignedCompanyId: companyId,
        requestStatus: "Assigned to Company",
        updatedAt: new Date(),
      },
      { returnDocument: "after" },
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Add activity log for company accepting offer
    await addActivityLog(
      requestId,
      ActivityActions.OFFER_ACCEPTED(
        companyId,
        companyName || "Company",
        cost,
        companyRate,
      ),
    );

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
