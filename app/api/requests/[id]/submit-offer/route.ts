import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

    // Update costOffers - set selected to true only for the chosen offer
    if (Array.isArray(targetRequest.costOffers)) {
      targetRequest.costOffers = targetRequest.costOffers.map((offer: any) => ({
        ...offer,
        selected: offer.company.id === offerId,
      }));
    }

    // Store selected company information
    targetRequest.selectedCompany = {
      name: selectedOffer.company.name,
      rate: selectedOffer.company.rate,
      cost: selectedOffer.cost,
    };

    // Update the cost to the selected company's cost
    targetRequest.cost = selectedOffer.cost.toFixed(2);

    // Update the request status to "Accepted" after selecting an offer
    targetRequest.requestStatus = "Accepted";
    
    targetRequest.updatedAt = new Date().toISOString();

    // Initialize activity history if it doesn't exist
    if (!Array.isArray(targetRequest.activityHistory)) {
      targetRequest.activityHistory = [];
    }

    // Add activity history entry
    targetRequest.activityHistory.push({
      timestamp: new Date().toISOString(),
      action: "Offer Selected",
      description: `Selected shipping offer from ${selectedOffer.company.name}`,
      companyName: selectedOffer.company.name,
      companyRate: selectedOffer.company.rate,
      cost: selectedOffer.cost,
    });

    // Save back to file
    fs.writeFileSync(
      requestsPath,
      JSON.stringify(requestsData, null, 2),
      "utf-8"
    );

    return NextResponse.json(
      { 
        success: true, 
        message: "Offer submitted successfully",
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
