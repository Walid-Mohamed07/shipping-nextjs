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
    const cost = selectedOffer?.cost;

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        assignedCompany: companyId,
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

    // Broadcast real-time event for assignment
    const requestOwnerId = currentRequest.user?.toString() || currentRequest.user;
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
