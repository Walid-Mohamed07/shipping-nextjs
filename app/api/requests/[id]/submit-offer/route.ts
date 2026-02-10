import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Submit Offer API (Client accepting a company's offer)
 * 
 * When a client accepts an offer:
 * - The offer is marked as accepted
 * - All other offers are marked as rejected
 * - The request is assigned to the company
 * - The request status is updated to "Assigned to Company"
 * - The request is removed from all other companies' view
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { offerId } = body;

    if (!offerId) {
      return NextResponse.json(
        { error: "offerId is required" },
        { status: 400 }
      );
    }

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    // Find the request
    const requestIndex = requestsData.requests.findIndex(
      (req: any) => req.id === id
    );

    if (requestIndex === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const targetRequest = requestsData.requests[requestIndex];

    // Check if request is already assigned
    if (targetRequest.assignedCompanyId) {
      return NextResponse.json(
        { error: "This request has already been assigned to a company" },
        { status: 400 }
      );
    }

    // Find the selected offer
    const selectedOffer = targetRequest.costOffers?.find(
      (offer: any) => offer.company.id === offerId
    );

    if (!selectedOffer) {
      return NextResponse.json(
        { error: "Selected offer not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update costOffers - accept selected, reject others
    if (Array.isArray(targetRequest.costOffers)) {
      targetRequest.costOffers = targetRequest.costOffers.map((offer: any) => ({
        ...offer,
        selected: offer.company.id === offerId,
        status: offer.company.id === offerId ? "accepted" : "rejected",
        acceptedAt: offer.company.id === offerId ? now : undefined,
        rejectedAt: offer.company.id !== offerId ? now : undefined,
      }));
    }

    // Assign the request to the company
    targetRequest.assignedCompanyId = selectedOffer.company.id;

    // Store selected company information
    targetRequest.selectedCompany = {
      name: selectedOffer.company.name,
      rate: selectedOffer.company.rate,
      cost: selectedOffer.cost,
    };

    // Update the cost to the selected company's cost
    targetRequest.cost = selectedOffer.cost.toFixed(2);

    // Update the request status to "Assigned to Company"
    targetRequest.requestStatus = "Assigned to Company";
    
    targetRequest.updatedAt = now;

    // Initialize activity history if it doesn't exist
    if (!Array.isArray(targetRequest.activityHistory)) {
      targetRequest.activityHistory = [];
    }

    // Add activity history entry
    targetRequest.activityHistory.push({
      timestamp: now,
      action: "offer_accepted",
      description: `Client accepted offer from ${selectedOffer.company.name} for $${selectedOffer.cost}`,
      companyName: selectedOffer.company.name,
      companyRate: selectedOffer.company.rate,
      cost: selectedOffer.cost,
    });

    // Add status history
    if (!Array.isArray(targetRequest.requestStatusHistory)) {
      targetRequest.requestStatusHistory = [];
    }
    targetRequest.requestStatusHistory.push({
      status: "Assigned to Company",
      changedAt: now,
      changedBy: targetRequest.userId,
      role: "client",
      note: `Assigned to ${selectedOffer.company.name}`,
    });

    // Check if warehouse assignment is needed (Self pickup)
    const needsWarehouseAssignment = 
      targetRequest.sourcePickupMode === "Self" || 
      targetRequest.source?.pickupMode === "Self";

    // Save back to file
    fs.writeFileSync(
      requestsPath,
      JSON.stringify(requestsData, null, 2),
      "utf-8"
    );

    return NextResponse.json(
      { 
        success: true, 
        message: "Offer accepted successfully! The request has been assigned to the company.",
        needsWarehouseAssignment,
        request: targetRequest 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting offer:", error);
    return NextResponse.json(
      { error: "Failed to submit offer" },
      { status: 500 }
    );
  }
}
