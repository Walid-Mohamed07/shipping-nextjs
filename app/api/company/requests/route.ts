import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";

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
            { assignedCompanyId: { $exists: false } },
            { assignedCompanyId: null },
            { assignedCompanyId: companyId },
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
      currentRequest.assignedCompanyId &&
      currentRequest.assignedCompanyId.toString() !== companyId
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

      const newOffer = {
        cost: offer.cost,
        comment: offer.comment || "",
        company: {
          id: companyId,
          name: offer.companyName || "Company",
        },
        selected: false,
        status: "pending",
        createdAt: new Date(),
      };

      if (!currentRequest.costOffers) {
        currentRequest.costOffers = [];
      }

      // Check if company already has an offer on this request
      const existingOfferIndex = currentRequest.costOffers.findIndex(
        (o: any) => o.company?.id === companyId,
      );

      const isUpdatingExistingOffer = existingOfferIndex >= 0;
      if (isUpdatingExistingOffer) {
        // Update existing offer from this company
        currentRequest.costOffers[existingOfferIndex] = newOffer;
      } else {
        // Push new offer while keeping previous records
        currentRequest.costOffers.push(newOffer);
      }

      if (currentRequest.requestStatus === "Accepted") {
        currentRequest.requestStatus = "Action needed";
      }

      currentRequest.updatedAt = new Date();
      await currentRequest.save();

      // Add activity log for offer submission/update
      const activity = isUpdatingExistingOffer
        ? ActivityActions.OFFER_UPDATED(
            companyId,
            offer.companyName || "Company",
            offer.cost,
            offer.comment,
          )
        : ActivityActions.OFFER_SUBMITTED(
            companyId,
            offer.companyName || "Company",
            offer.cost,
            offer.comment,
          );
      await addActivityLog(requestId, activity);

      return NextResponse.json(
        {
          success: true,
          message: isUpdatingExistingOffer
            ? "Offer updated successfully"
            : "Offer submitted successfully",
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
