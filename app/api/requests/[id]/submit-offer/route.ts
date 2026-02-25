import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions } from "@/lib/activityLogger";

/**
 * @swagger
 * /api/requests/{id}/submit-offer:
 *   post:
 *     summary: Accept a company's offer for a request
 *     tags: [Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [offerId]
 *             properties:
 *               offerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offer accepted successfully
 *       500:
 *         description: Failed to process offer
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { offerId } = body;

    if (!offerId) {
      return NextResponse.json(
        { error: "offerId is required" },
        { status: 400 },
      );
    }

    // Get the request first to find the offer details
    const currentRequest = await Request.findById(id);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Find the selected offer to get company name, id, and cost
    const selectedOffer = currentRequest.costOffers?.find(
      (offer: any) => offer.company?.id === offerId,
    );
    const companyName = selectedOffer?.company?.name || "Unknown Company";
    const companyId = selectedOffer?.company?.id; // Use the offerId directly as it's the company ID
    const cost = selectedOffer?.cost;

    if (!selectedOffer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in offer" },
        { status: 400 },
      );
    }

    // Mark the accepted offer and update request status
    const updatedRequest = await Request.findByIdAndUpdate(
      id,
      {
        $set: {
          requestStatus: "Assigned to Company",
          assignedCompany: companyId,
          "costOffers.$[elem].selected": true,
        },
        $push: {
          activityHistory: {
            action: "offer_accepted",
            timestamp: new Date(),
            description: `Client accepted offer from ${companyName} for $${cost}`,
            companyName,
            cost,
            details: { offerId, companyId },
          },
        },
      },
      {
        returnDocument: "after",
        arrayFilters: [{ "elem.company.id": offerId }],
      },
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Offer accepted successfully! The request has been assigned to the company.",
        request: updatedRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
