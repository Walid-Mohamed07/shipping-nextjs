import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, Settings } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import { broadcastEvent, broadcastToUserAndAdmins } from "@/lib/eventBroadcaster";

/**
 * @swagger
 * /api/company/requests:
 *   get:
 *     summary: Get requests visible to company with filtering rules
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of visible requests for company
 *       400:
 *         description: Missing companyId
 *       500:
 *         description: Failed to fetch requests
 *   post:
 *     summary: Company actions on requests (submit offer, reject)
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, requestId, companyId]
 *             properties:
 *               action:
 *                 type: string
 *               requestId:
 *                 type: string
 *               companyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action completed successfully
 *       500:
 *         description: Failed to process action
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 },
      );
    }

    // Filter requests based on visibility rules
    const visibleRequests = await Request.find({
      $and: [
        {
          requestStatus: { $in: ["Accepted", "Action needed"] },
        },
        {
          $or: [
            { assignedCompany: { $exists: false } },
            { assignedCompany: null },
            { assignedCompany: companyId },
          ],
        },
        {
          $or: [
            { rejectedByCompanies: { $nin: [companyId] } },
            { rejectedByCompanies: { $exists: false } },
          ],
        },
      ],
    })
      .populate("user", "email fullName phoneNumber profilePicture")
      .lean();

    return NextResponse.json({ requests: visibleRequests }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { action, requestId, companyId, offer } = body;

    if (!action || !requestId || !companyId) {
      return NextResponse.json(
        { error: "action, requestId, and companyId are required" },
        { status: 400 },
      );
    }

    const currentRequest = await Request.findById(requestId);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify request is still available for this company
    if (
      currentRequest.assignedCompany &&
      currentRequest.assignedCompany.toString() !== companyId
    ) {
      return NextResponse.json(
        { error: "This request has already been assigned to another company" },
        { status: 400 },
      );
    }

    if (action === "add-offer") {
      // Validate offer data
      if (!offer || typeof offer.cost !== "number" || offer.cost <= 0) {
        return NextResponse.json(
          { error: "Valid cost amount is required" },
          { status: 400 },
        );
      }

      if (!currentRequest.costOffers) {
        currentRequest.costOffers = [] as any;
      }

      // Check if company has already submitted an offer
      const companyOffers = currentRequest.costOffers.filter(
        (o: any) => o.company?.id === companyId,
      );
      
      if (companyOffers.length >= 1) {
        return NextResponse.json(
          { error: "You have already submitted an offer for this request" },
          { status: 400 },
        );
      }

      // Fetch headover settings
      let headoverPercentage = 0;
      try {
        const settings = await Settings.findOne({ key: "global" });
        if (settings?.headoverPercentage != null) {
          headoverPercentage = settings.headoverPercentage;
        }
      } catch {
        // If settings unavailable, fallback to 0%
      }

      const companyCost = offer.cost;
      const headoverAmount = parseFloat(
        (companyCost * (headoverPercentage / 100)).toFixed(2),
      );
      const finalPrice = parseFloat((companyCost + headoverAmount).toFixed(2));

      const newOffer = {
        cost: companyCost,
        currency: offer.currency || "USD", // Store the currency from the offer
        headoverPercentage,
        headoverAmount,
        finalPrice,
        comment: offer.comment || "",
        company: {
          id: companyId,
          name: offer.companyName || "Company",
          rate: offer.companyRate?.toString() || "0",
          phoneNumber: body.company?.phoneNumber || "",
          email: body.company?.email || "",
          address: body.company?.address || "",
        },
        selected: false,
        status: "pending",
        pickupDateTime: offer.pickupDateTime ? new Date(offer.pickupDateTime) : undefined,
        deliveryDateTime: offer.deliveryDateTime ? new Date(offer.deliveryDateTime) : undefined,
        createdAt: new Date(),
      };

      // Always add new offer (no updating allowed)
      currentRequest.costOffers.push(newOffer);

      if (currentRequest.requestStatus === "Accepted") {
        currentRequest.requestStatus = "Action needed";
      }

      // Clear any previously auto-set selectedCompany / assignedCompany
      // so that the request is not shown as accepted until the user explicitly picks an offer
      if (currentRequest.requestStatus === "Action needed") {
        currentRequest.selectedCompany = undefined;
        currentRequest.assignedCompany = undefined;
      }

      currentRequest.updatedAt = new Date();
      await currentRequest.save();

      // Add activity log for offer submission
      const activity = ActivityActions.OFFER_SUBMITTED(
        companyId,
        offer.companyName || "Company",
        offer.cost,
        offer.comment,
        offer.currency || "USD",
      );
      await addActivityLog(requestId, activity);

      // Broadcast real-time event for offer
      const requestOwnerId = String(currentRequest.user?.toString?.() || currentRequest.user || "");
      broadcastEvent("OFFER_SUBMITTED", {
        requestId,
        companyId,
        companyName: offer.companyName || "Company",
        cost: offer.cost,
        comment: offer.comment,
      }, {
        requestId,
        userId: companyId,
        targetUsers: requestOwnerId ? [requestOwnerId] : undefined,
        targetRoles: ["admin", "operator"],
      });
      
      // Also notify the client who owns the request
      if (requestOwnerId) {
        broadcastToUserAndAdmins(requestOwnerId, "OFFER_SUBMITTED", {
          requestId,
          companyId,
          companyName: offer.companyName || "Company",
          cost: offer.cost,
        }, requestId);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Offer submitted successfully",
        },
        { status: 200 },
      );
    }

    if (action === "reject-request") {
      if (!currentRequest.rejectedByCompanies) {
        currentRequest.rejectedByCompanies = [];
      }

      if (!currentRequest.rejectedByCompanies.includes(companyId)) {
        currentRequest.rejectedByCompanies.push(companyId);
      }

      currentRequest.updatedAt = new Date();
      await currentRequest.save();

      // Add activity log for rejection
      const companyName = body.companyName || "Company";
      await addActivityLog(
        requestId,
        ActivityActions.REQUEST_REJECTED_BY_COMPANY(companyId, companyName),
      );

      return NextResponse.json(
        { success: true, message: "Request rejected" },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
