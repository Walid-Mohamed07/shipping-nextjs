import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import { broadcastEvent, broadcastToUserAndAdmins } from "@/lib/eventBroadcaster";

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

    if (!selectedOffer) {
      return NextResponse.json(
        { error: "Offer not found for this company" },
        { status: 404 },
      );
    }

    const cost = selectedOffer?.cost;
    const finalPrice = selectedOffer?.finalPrice || cost;
    const headoverPercentage = selectedOffer?.headoverPercentage || 0;
    const offerCurrency = selectedOffer?.currency || "USD";
    const companyRateFromOffer = selectedOffer?.company?.rate || companyRate || "";
    const companyNameFromOffer = selectedOffer?.company?.name || companyName || "Company";

    if (!cost || cost <= 0) {
      return NextResponse.json(
        { error: "Offer has invalid or missing price" },
        { status: 400 },
      );
    }

    // Update request with assignedCompany and selectedCompany (with full details including cost)
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        assignedCompany: companyId,
        requestStatus: "Assigned to Company",
        selectedCompany: {
          id: companyId,
          name: companyNameFromOffer,
          rate: companyRateFromOffer,
          cost: cost,
          finalPrice: finalPrice,
          headoverPercentage: headoverPercentage,
          currency: offerCurrency,
        },
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
        offerCurrency,
      ),
    );

    // Broadcast real-time event for assignment
    const requestOwnerId = String(currentRequest.user);
    broadcastEvent("ASSIGNMENT_UPDATED", {
      requestId,
      companyId,
      companyName: companyName || "Company",
      status: "Assigned to Company",
    }, {
      requestId,
      targetRoles: ["admin", "operator"],
    });
    
    // Notify the client who owns the request
    if (requestOwnerId) {
      broadcastToUserAndAdmins(requestOwnerId, "ASSIGNMENT_UPDATED", {
        requestId,
        companyId,
        companyName: companyName || "Company",
        status: "Assigned to Company",
        message: "Your request has been assigned to a company!",
      }, requestId);
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
