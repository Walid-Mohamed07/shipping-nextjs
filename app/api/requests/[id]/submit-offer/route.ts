import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, Settings, User } from "@/lib/models";
import { ActivityActions } from "@/lib/activityLogger";
import {
  broadcastEvent,
  broadcastToCompanies,
  broadcastToAdmins,
} from "@/lib/eventBroadcaster";
import { getCurrentUser, isUserAuthorizedForRequest } from "@/lib/auth-helpers";
import { lockPrice, formatAmount } from "@/lib/currencyService";
import { getCurrencyFromCountry, BASE_CURRENCY, FALLBACK_CURRENCY } from "@/constants/currencies";

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
    const { offerId, clientCurrency: requestedCurrency } = body;

    if (!offerId) {
      return NextResponse.json(
        { error: "offerId is required" },
        { status: 400 },
      );
    }

    console.log("[Submit-offer] Received offerId:", offerId, "clientCurrency:", requestedCurrency);

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
    console.log(
      "[Submit-offer] Available offers:",
      currentRequest.costOffers?.map((o: any) => ({
        offerId: o._id?.toString(),
        companyId: o.company?.id,
        companyName: o.company?.name,
      })),
    );

    const selectedOffer = currentRequest.costOffers?.find((offer: any) => {
      // Match against company.id since that's what the frontend sends
      const companyIdMatch = offer.company?.id === offerId;
      console.log(
        `[Submit-offer] Comparing ${offer.company?.id} === ${offerId}: ${companyIdMatch}`,
      );
      return companyIdMatch;
    });

    if (!selectedOffer) {
      console.error("[Submit-offer] Offer not found for offerId:", offerId);
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const companyName = selectedOffer?.company?.name || "Unknown Company";
    const companyId = selectedOffer?.company?.id; // Use the offerId directly as it's the company ID
    const companyRate = selectedOffer?.company?.rate || "";
    const cost = typeof selectedOffer?.cost === "number" && !isNaN(selectedOffer.cost)
      ? selectedOffer.cost
      : selectedOffer?.finalPrice && !isNaN(Number(selectedOffer.finalPrice))
        ? Number(selectedOffer.finalPrice)
        : null;

    if (cost === null || cost <= 0) {
      console.error("[Submit-offer] Offer has invalid/missing cost:", selectedOffer?.cost);
      return NextResponse.json(
        { error: "Offer has an invalid or missing price. Please contact support." },
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

    const rawFinalPrice = selectedOffer?.finalPrice;
    const finalPrice = rawFinalPrice !== undefined && !isNaN(Number(rawFinalPrice))
      ? Number(rawFinalPrice)   // use pre-computed finalPrice if stored on offer
      : cost * (1 + headoverPercentage / 100);

    // Get the offer's currency (default to USD)
    const offerCurrency = selectedOffer?.currency || BASE_CURRENCY;

    // Determine client's preferred currency
    // Priority: 1. Requested currency in body, 2. User's preferred currency, 3. Country-based, 4. Fallback to USD
    let clientCurrency = requestedCurrency;
    
    if (!clientCurrency) {
      // Try to get from user profile
      const userDoc = await User.findById(currentUser.id).lean().exec() as any;
      if (userDoc?.preferredCurrency) {
        clientCurrency = userDoc.preferredCurrency;
      } else if (userDoc?.country) {
        clientCurrency = getCurrencyFromCountry(userDoc.country);
      }
    }
    
    // Fallback to base currency
    if (!clientCurrency) {
      clientCurrency = offerCurrency; // Use the same currency as the offer
    }

    // Lock the price at current exchange rate
    const lockedPriceData = await lockPrice(finalPrice, offerCurrency, clientCurrency);

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
      "lockedPrice:",
      lockedPriceData.lockedPrice,
      "clientCurrency:",
      clientCurrency,
      "exchangeRate:",
      lockedPriceData.exchangeRateAtAcceptance,
    );

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in offer" },
        { status: 400 },
      );
    }

    // Mark the accepted offer and update request status
    // Also set selectedCompany with full details including cost and finalPrice for UI display
    // Store locked price information for payment
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
            finalPrice: finalPrice,
            headoverPercentage: headoverPercentage,
            currency: offerCurrency,
          },
          // Currency locking - store locked price at acceptance
          pricing: {
            basePrice: finalPrice,
            baseCurrency: offerCurrency,
            clientCurrency: clientCurrency,
            exchangeRateAtAcceptance: lockedPriceData.exchangeRateAtAcceptance,
            lockedPrice: lockedPriceData.lockedPrice,
            lockedAt: lockedPriceData.lockedAt,
            finalLockedPrice: lockedPriceData.lockedPrice,
          },
          "costOffers.$[elem].selected": true,
        },
        $push: {
          activityHistory: {
            action: "offer_accepted",
            timestamp: new Date(),
            description: `Client accepted offer from ${companyName} for ${!isNaN(lockedPriceData.lockedPrice) ? formatAmount(lockedPriceData.lockedPrice, clientCurrency) : formatAmount(finalPrice, offerCurrency)}`,
            companyName,
            companyRate,
            cost: finalPrice,
            details: { 
              offerId, 
              companyId, 
              baseCost: cost, 
              headoverPercentage,
              // Currency locking details
              baseCurrency: offerCurrency,
              clientCurrency: clientCurrency,
              exchangeRate: lockedPriceData.exchangeRateAtAcceptance,
              lockedPrice: lockedPriceData.lockedPrice,
            },
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
        pricing: lockedPriceData,
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
        pricing: lockedPriceData,
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
        pricing: {
          basePrice: lockedPriceData.basePrice,
          baseCurrency: lockedPriceData.baseCurrency,
          clientCurrency: lockedPriceData.clientCurrency,
          exchangeRate: lockedPriceData.exchangeRateAtAcceptance,
          lockedPrice: lockedPriceData.lockedPrice,
          formattedPrice: formatAmount(lockedPriceData.lockedPrice, lockedPriceData.clientCurrency),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
