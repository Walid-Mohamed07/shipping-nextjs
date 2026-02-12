import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Accept Offer API
 * 
 * When a client accepts an offer from a company:
 * - The request is assigned to that company
 * - The offer status → accepted
 * - Other offers → rejected
 * - Request status → "Assigned to Company"
 * - Request is removed from all other companies' dashboards
 * 
 * This is enforced at the database/API level.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, companyId, userId } = body;

    if (!requestId || !companyId) {
      return NextResponse.json(
        { error: "requestId and companyId are required" },
        { status: 400 }
      );
    }

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const requestIndex = requestsData.requests.findIndex(
      (r: any) => r.id === requestId
    );

    if (requestIndex === -1) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const currentRequest = requestsData.requests[requestIndex];
    const now = new Date().toISOString();

    // Verify the request is not already assigned
    if (currentRequest.assignedCompanyId) {
      return NextResponse.json(
        { error: "This request has already been assigned to a company" },
        { status: 400 }
      );
    }

    // Verify the company has an offer on this request
    const offerIndex = currentRequest.costOffers?.findIndex(
      (o: any) => o.company?.id === companyId
    );

    if (offerIndex === undefined || offerIndex < 0) {
      return NextResponse.json(
        { error: "This company does not have an offer on this request" },
        { status: 400 }
      );
    }

    // Accept this offer, reject all others
    currentRequest.costOffers = currentRequest.costOffers.map((offer: any, index: number) => {
      if (index === offerIndex) {
        return {
          ...offer,
          selected: true,
          status: "accepted",
          acceptedAt: now,
        };
      } else {
        return {
          ...offer,
          selected: false,
          status: "rejected",
          rejectedAt: now,
        };
      }
    });

    // Assign request to the company
    currentRequest.assignedCompanyId = companyId;
    currentRequest.requestStatus = "Assigned to Company";
    
    // Store the selected company info
    const acceptedOffer = currentRequest.costOffers[offerIndex];
    currentRequest.selectedCompany = {
      name: acceptedOffer.company.name,
      rate: acceptedOffer.company.rate || "N/A",
      cost: acceptedOffer.cost,
    };

    // Add to activity history
    if (!currentRequest.activityHistory) {
      currentRequest.activityHistory = [];
    }
    currentRequest.activityHistory.push({
      timestamp: now,
      action: "offer_accepted",
      description: `Client accepted offer from ${acceptedOffer.company.name} for $${acceptedOffer.cost}`,
      companyName: acceptedOffer.company.name,
      companyRate: acceptedOffer.company.rate,
      cost: acceptedOffer.cost,
    });

    // Update status history
    if (!currentRequest.requestStatusHistory) {
      currentRequest.requestStatusHistory = [];
    }
    currentRequest.requestStatusHistory.push({
      status: "Assigned to Company",
      changedAt: now,
      changedBy: userId || "client",
      role: "client",
      note: `Assigned to ${acceptedOffer.company.name}`,
    });

    currentRequest.updatedAt = now;

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    // Check if warehouse assignment is needed (Self pickup)
    const needsWarehouseAssignment = 
      currentRequest.sourcePickupMode === "Self" || 
      currentRequest.source?.pickupMode === "Self";

    return NextResponse.json({
      success: true,
      message: "Offer accepted successfully",
      needsWarehouseAssignment,
      request: currentRequest,
    }, { status: 200 });
  } catch (error) {
    console.error("Error accepting offer:", error);
    return NextResponse.json(
      { error: "Failed to accept offer" },
      { status: 500 }
    );
  }
}
