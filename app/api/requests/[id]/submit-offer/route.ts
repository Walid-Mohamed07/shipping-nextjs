import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, Settings } from "@/lib/models";
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
    // The offerId is the offer's _id from the frontend
    console.log("[Submit-offer] Looking for offer with _id:", offerId);
    console.log(
      "[Submit-offer] Available offers:",
      currentRequest.costOffers?.map((o: any) => ({
        offerId: o._id?.toString(),
        companyId: o.company?.id,
        companyName: o.company?.name,
      })),
    );

    const selectedOffer = currentRequest.costOffers?.find((offer: any) => {
      // Match against offer's _id to get the specific offer the user selected
      const offerIdMatch = offer._id?.toString() === offerId || String(offer._id) === offerId;
      console.log(
        `[Submit-offer] Comparing ${offer._id?.toString()} === ${offerId}: ${offerIdMatch}`,
      );
      return offerIdMatch;
    });

    if (!selectedOffer) {
      console.error("[Submit-offer] Offer not found for offerId:", offerId);
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const companyName = selectedOffer?.company?.name || "Unknown Company";
    const companyId = selectedOffer?.company?.id;
    const companyRate = selectedOffer?.company?.rate || "";
    const cost = selectedOffer?.cost;

    if (!cost || cost <= 0) {
      return NextResponse.json(
        { error: "Invalid offer cost" },
        { status: 400 },
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in offer" },
        { status: 400 },
      );
    }

    // Fetch headover percentage from settings for final price calculation
    let headoverPercentage = 0;
    try {
      const settings = await Settings.findOne({ key: "global" }).lean().exec();
      if (settings && typeof settings.headoverPercentage === "number") {
        headoverPercentage = settings.headoverPercentage;
      }
    } catch (settingsError) {
      console.error(
        "[Submit-offer] Failed to fetch headover settings:",
        settingsError,
      );
      // Continue with 0% headover if settings fetch fails
    }

    const finalPrice = cost * (1 + headoverPercentage / 100);

    console.log(
      "[Submit-offer] Setting assignedCompany to:",
      companyId,
      "from offer company.id",
      "baseCost:",
      cost,
      "headoverPercentage:",
      headoverPercentage,
      "finalPrice:",
      finalPrice,
    );

    // Mark the accepted offer but keep status as "Action needed" until payment is completed
    // Set selectedCompany with full details including cost and finalPrice for UI display
    // Status will change to "Assigned to Company" only after successful payment
    
    // First, unset all offers' selected field, then set only the chosen one
    await Request.updateOne(
      { _id: currentRequest._id },
      { $set: { "costOffers.$[].selected": false } }
    );
    
    const updatedRequest = await Request.findByIdAndUpdate(
      currentRequest._id,
      {
        $set: {
          // Keep requestStatus as "Action needed" - will change to "Assigned to Company" after payment
          assignedCompany: companyId,
          selectedCompany: {
            id: companyId,
            name: companyName,
            rate: companyRate,
            cost: cost,
            finalPrice: finalPrice,
            headoverPercentage: headoverPercentage,
          },
          "costOffers.$[elem].selected": true,
        },
        $push: {
          activityHistory: {
            action: "offer_selected",
            timestamp: new Date(),
            description: `Client selected offer from ${companyName} for $${finalPrice.toFixed(2)} - awaiting payment`,
            companyName,
            companyRate,
            cost: finalPrice,
            details: { offerId, companyId, baseCost: cost, headoverPercentage },
          },
        },
      },
      {
        returnDocument: "after",
        arrayFilters: [{ "elem._id": offerId }],
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
          "Offer selected successfully! Please proceed to checkout to complete your payment.",
        request: updatedRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
