import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import { broadcastEvent, broadcastToUserAndAdmins } from "@/lib/eventBroadcaster";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, driverId, userId, driverName, driverRate } = body;

    if (!requestId || !driverId) {
      return NextResponse.json(
        { error: "requestId and driverId are required" },
        { status: 400 },
      );
    }

    // Get current request to find offer cost
    const currentRequest = await Request.findById(requestId);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const selectedOffer = currentRequest.costOffers?.find(
      (offer: any) => offer.driver?.id === driverId,
    );

    if (!selectedOffer) {
      return NextResponse.json(
        { error: "Offer not found for this driver" },
        { status: 404 },
      );
    }

    const cost = selectedOffer?.cost;
    const finalPrice = selectedOffer?.finalPrice || cost;
    const headoverPercentage = selectedOffer?.headoverPercentage || 0;
    const offerCurrency = selectedOffer?.currency || "USD";
    const driverRateFromOffer = selectedOffer?.driver?.rate || driverRate || "";
    const driverNameFromOffer = selectedOffer?.driver?.name || driverName || "Driver";

    if (!cost || cost <= 0) {
      return NextResponse.json(
        { error: "Offer has invalid or missing price" },
        { status: 400 },
      );
    }

    // Update request with assignedDriver and selectedDriver (with full details including cost)
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        assignedDriver: driverId,
        requestStatus: "Assigned to Driver",
        selectedDriver: {
          id: driverId,
          name: driverNameFromOffer,
          rate: driverRateFromOffer,
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

    // Add activity log for driver accepting offer
    await addActivityLog(
      requestId,
      ActivityActions.OFFER_ACCEPTED(
        driverId,
        driverName || "Driver",
        cost,
        driverRate,
        offerCurrency,
      ),
    );

    // Broadcast real-time event for assignment
    const requestOwnerId = String(currentRequest.user);
    broadcastEvent("ASSIGNMENT_UPDATED", {
      requestId,
      driverId,
      driverName: driverName || "Driver",
      status: "Assigned to Driver",
    }, {
      requestId,
      targetRoles: ["admin", "operator"],
    });
    
    // Notify the client who owns the request
    if (requestOwnerId) {
      broadcastToUserAndAdmins(requestOwnerId, "ASSIGNMENT_UPDATED", {
        requestId,
        driverId,
        driverName: driverName || "Driver",
        status: "Assigned to Driver",
        message: "Your request has been assigned to a driver!",
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
