import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, Settings } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import { broadcastEvent, broadcastToUserAndAdmins } from "@/lib/eventBroadcaster";

/**
 * @swagger
 * /api/driver/requests:
 *   get:
 *     summary: Get requests visible to driver with filtering rules
 *     tags: [Driver]
 *     parameters:
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of visible requests for driver
 *       400:
 *         description: Missing driverId
 *       500:
 *         description: Failed to fetch requests
 *   post:
 *     summary: Driver actions on requests (submit offer, reject)
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, requestId, driverId]
 *             properties:
 *               action:
 *                 type: string
 *               requestId:
 *                 type: string
 *               driverId:
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
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { error: "driverId is required" },
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
            { assignedDriver: { $exists: false } },
            { assignedDriver: null },
            { assignedDriver: driverId },
          ],
        },
        {
          $or: [
            { rejectedByDrivers: { $nin: [driverId] } },
            { rejectedByDrivers: { $exists: false } },
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
    const { action, requestId, driverId, offer } = body;

    if (!action || !requestId || !driverId) {
      return NextResponse.json(
        { error: "action, requestId, and driverId are required" },
        { status: 400 },
      );
    }

    const currentRequest = await Request.findById(requestId);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify request is still available for this driver
    if (
      currentRequest.assignedDriver &&
      currentRequest.assignedDriver.toString() !== driverId
    ) {
      return NextResponse.json(
        { error: "This request has already been assigned to another driver" },
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

      // Check if driver has already submitted an offer
      const driverOffers = currentRequest.costOffers.filter(
        (o: any) => o.driver?.id === driverId,
      );
      
      if (driverOffers.length >= 1) {
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

      const driverCost = offer.cost;
      const headoverAmount = parseFloat(
        (driverCost * (headoverPercentage / 100)).toFixed(2),
      );
      const finalPrice = parseFloat((driverCost + headoverAmount).toFixed(2));

      const newOffer = {
        cost: driverCost,
        currency: offer.currency || "USD", // Store the currency from the offer
        headoverPercentage,
        headoverAmount,
        finalPrice,
        comment: offer.comment || "",
        driver: {
          id: driverId,
          name: offer.driverName || "Driver",
          rate: offer.driverRate?.toString() || "0",
          phoneNumber: body.driver?.phoneNumber || "",
          email: body.driver?.email || "",
          address: body.driver?.address || "",
        },
        selected: false,
        status: "pending",
        createdAt: new Date(),
      };

      // Always add new offer (no updating allowed)
      currentRequest.costOffers.push(newOffer);

      if (currentRequest.requestStatus === "Accepted") {
        currentRequest.requestStatus = "Action needed";
      }

      // Clear any previously auto-set selectedDriver / assignedDriver
      // so that the request is not shown as accepted until the user explicitly picks an offer
      if (currentRequest.requestStatus === "Action needed") {
        currentRequest.selectedDriver = undefined;
        currentRequest.assignedDriver = undefined;
      }

      currentRequest.updatedAt = new Date();
      await currentRequest.save();

      // Add activity log for offer submission
      const activity = ActivityActions.OFFER_SUBMITTED(
        driverId,
        offer.driverName || "Driver",
        offer.cost,
        offer.comment,
        offer.currency || "USD",
      );
      await addActivityLog(requestId, activity);

      // Broadcast real-time event for offer
      const requestOwnerId = String(currentRequest.user?.toString?.() || currentRequest.user || "");
      broadcastEvent("OFFER_SUBMITTED", {
        requestId,
        driverId,
        driverName: offer.driverName || "Driver",
        cost: offer.cost,
        comment: offer.comment,
      }, {
        requestId,
        userId: driverId,
        targetUsers: requestOwnerId ? [requestOwnerId] : undefined,
        targetRoles: ["admin", "operator"],
      });
      
      // Also notify the client who owns the request
      if (requestOwnerId) {
        broadcastToUserAndAdmins(requestOwnerId, "OFFER_SUBMITTED", {
          requestId,
          driverId,
          driverName: offer.driverName || "Driver",
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
      if (!currentRequest.rejectedByDrivers) {
        currentRequest.rejectedByDrivers = [];
      }

      if (!currentRequest.rejectedByDrivers.includes(driverId)) {
        currentRequest.rejectedByDrivers.push(driverId);
      }

      currentRequest.updatedAt = new Date();
      await currentRequest.save();

      // Add activity log for rejection
      const driverName = body.driverName || "Driver";
      await addActivityLog(
        requestId,
        ActivityActions.REQUEST_REJECTED_BY_DRIVER(driverId, driverName),
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
