import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions } from "@/lib/activityLogger";
import {
  broadcastEvent,
  broadcastToCompanies,
  broadcastToAdmins,
} from "@/lib/eventBroadcaster";
import { getCurrentUser, isUserAuthorizedForRequest } from "@/lib/auth-helpers";

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

    console.log("[Submit-offer] Received offerId:", offerId);

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
    const requestOwnerId =
      currentRequest.user?.toString?.() || String(currentRequest.user);
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
    // The offerId is the company.id from the frontend
    console.log("[Submit-offer] Looking for offer with company.id:", offerId);
    console.log("[Submit-offer] Available offers:", currentRequest.costOffers?.map((o: any) => ({
      offerId: o._id?.toString(),
      companyId: o.company?.id,
      companyName: o.company?.name
    })));

    const selectedOffer = currentRequest.costOffers?.find((offer: any) => {
      // Match against company.id since that's what the frontend sends
      const companyIdMatch = offer.company?.id === offerId;
      console.log(`[Submit-offer] Comparing ${offer.company?.id} === ${offerId}: ${companyIdMatch}`);
      return companyIdMatch;
    });

    if (!selectedOffer) {
      console.error("[Submit-offer] Offer not found for offerId:", offerId);
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const companyName = selectedOffer?.company?.name || "Unknown Company";
    const companyId = selectedOffer?.company?.id; // Use the offerId directly as it's the company ID
    const companyRate = selectedOffer?.company?.rate || "";
    const cost = selectedOffer?.cost;

    console.log(
      "[Submit-offer] Setting assignedCompany to:",
      companyId,
      "from offer company.id",
    );

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in offer" },
        { status: 400 },
      );
    }

    // Mark the accepted offer and update request status
    // Also set selectedCompany with full details including cost for UI display
    const updatedRequest = await Request.findByIdAndUpdate(
      currentRequest._id,
      {
        $set: {
          requestStatus: "Assigned to Company",
          assignedCompany: companyId,
          selectedCompany: {
            id: companyId,
            name: companyName,
            rate: companyRate,
            cost: cost,
          },
          "costOffers.$[elem].selected": true,
        },
        $push: {
          activityHistory: {
            action: "offer_accepted",
            timestamp: new Date(),
            description: `Client accepted offer from ${companyName} for $${cost}`,
            companyName,
            companyRate,
            cost,
            details: { offerId, companyId },
          },
        },
      },
      {
        returnDocument: "after",
        arrayFilters: [{ "elem.company.id": companyId }],
      },
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Broadcast real-time event for offer accepted
    broadcastEvent(
      "OFFER_ACCEPTED",
      {
        requestId: id,
        offerId,
        companyId,
        companyName,
        cost,
      },
      {
        requestId: id,
        targetRoles: ["admin", "operator", "company"],
      },
    );

    // Notify the company whose offer was accepted
    broadcastEvent(
      "OFFER_ACCEPTED",
      {
        requestId: id,
        offerId,
        companyId,
        companyName,
        cost,
        message: "Your offer has been accepted!",
      },
      {
        requestId: id,
        targetUsers: [companyId],
      },
    );

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
