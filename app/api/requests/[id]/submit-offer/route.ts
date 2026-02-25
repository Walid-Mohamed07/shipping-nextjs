import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions } from "@/lib/activityLogger";
import { getCurrentUser, isUserAuthorizedForRequest } from "@/lib/auth-helpers";
import mongoose from "mongoose";

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

    // Get current user for authorization check
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    // Try to find by publicId first, then fallback to MongoDB ID for backward compatibility
    let currentRequest = await Request.findOne({ publicId: id });
    if (!currentRequest && id.match(/^[0-9a-fA-F]{24}$/)) {
      currentRequest = await Request.findById(id);
    }

    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check authorization: user must be the owner
    const requestOwnerId = currentRequest.user?.toString?.() || String(currentRequest.user);
    const isAuthorized = isUserAuthorizedForRequest(
      currentUser.id,
      currentUser.role,
      requestOwnerId,
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden - you do not have access to this request" },
        { status: 403 },
      );
    }

    // Find the selected offer to get company name, id, and cost
    // The offerId matches the offer's _id in the costOffers array
    const selectedOffer = currentRequest.costOffers?.find(
      (offer: any) => {
        // Compare both as strings to handle ObjectId comparison
        const offerIdStr = offer._id?.toString?.() || String(offer._id);
        return offerIdStr === offerId;
      },
    );
    
    if (!selectedOffer) {
      return NextResponse.json(
        { error: "Offer not found" },
        { status: 404 },
      );
    }
    
    const companyName = selectedOffer?.company?.name || "Unknown Company";
    const companyId = selectedOffer?.company?.id; // Get the company ID from the offer
    const cost = selectedOffer?.cost;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in offer" },
        { status: 400 },
      );
    }

    // Mark the accepted offer and update request status
    // Convert offerId to ObjectId for the arrayFilter
    const offerObjectId = offerId.match(/^[0-9a-fA-F]{24}$/)
      ? new mongoose.Types.ObjectId(offerId)
      : offerId;

    const updatedRequest = await Request.findByIdAndUpdate(
      currentRequest._id,
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
        arrayFilters: [{ "elem._id": offerObjectId }],
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
