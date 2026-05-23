import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import {
  broadcastEvent,
  broadcastToUserAndAdmins,
} from "@/lib/eventBroadcaster";

/**
 * Delivery Status Flow:
 *
 * 1. Pending - Initial state
 * 2. Picked Up Source - Items collected from source
 * 3. In Transit - Items moving between locations
 * 4. Shipment Deliver - Out for final delivery
 * 5. Delivered - Complete
 */

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ["Picked Up Source"],
  "Picked Up Source": ["In Transit"],
  "In Transit": ["Shipment Deliver"],
  "Shipment Deliver": ["Delivered"],
  Delivered: [],
  Failed: [],
};

/**
 * @swagger
 * /api/driver/delivery-status:
 *   put:
 *     summary: Update delivery status for a request (driver only)
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId, driverId, newStatus]
 *             properties:
 *               requestId:
 *                 type: string
 *               driverId:
 *                 type: string
 *               newStatus:
 *                 type: string
 *                 enum: [Pending, Picked Up Source, In Transit, Shipment Deliver, Delivered, Failed]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Unauthorized - request not assigned to this driver
 *       404:
 *         description: Request not found
 *       500:
 *         description: Failed to update status
 */

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, driverId, newStatus, note } = body;

    if (!requestId || !driverId || !newStatus) {
      return NextResponse.json(
        { error: "requestId, driverId, and newStatus are required" },
        { status: 400 },
      );
    }

    // Find the request and verify it's assigned to this driver
    // Check both assignedDriver and selectedDriver.id for robustness
    const existingRequest = await Request.findOne({
      _id: requestId,
      $or: [
        { assignedDriver: driverId },
        { "selectedDriver.id": driverId },
      ],
    });

    if (!existingRequest) {
      console.log(
        `[Delivery Status] Request not found for requestId: ${requestId}, driverId: ${driverId}`
      );
      return NextResponse.json(
        {
          error: "Request not found or you don't have permission to update it",
        },
        { status: 404 },
      );
    }

    const currentStatus = existingRequest.deliveryStatus || "Pending";

    // Validate the transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(", ") || "none"}`,
        },
        { status: 400 },
      );
    }

    // Update the delivery status
    const updateData: any = {
      deliveryStatus: newStatus,
      updatedAt: new Date(),
    };

    // Update request status based on delivery progress
    if (newStatus === "In Transit" || newStatus === "Picked Up Source") {
      updateData.requestStatus = "In Progress";
    } else if (newStatus === "Delivered") {
      updateData.requestStatus = "Completed";
    }

    // Add to delivery status history
    const historyEntry = {
      status: newStatus,
      timestamp: new Date(),
      role: "driver",
      reason: note || `Status updated to ${newStatus}`,
    };

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        ...updateData,
        $push: { deliveryStatusHistory: historyEntry },
      },
      { new: true },
    )
      .populate("user", "email fullName mobile")
      .lean();

    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 },
      );
    }

    // Add activity log (include note if provided)
    await addActivityLog(
      requestId,
      ActivityActions.DELIVERY_STATUS_CHANGED(currentStatus, newStatus, note),
    );

    // Broadcast real-time event for delivery status change
    const requestOwnerId = existingRequest.user?.toString();
    broadcastEvent(
      "DELIVERY_STATUS_CHANGED",
      {
        requestId,
        previousStatus: currentStatus,
        newStatus,
        note,
      },
      {
        requestId,
        targetRoles: ["admin", "operator", "driver"],
      },
    );

    // Notify the client who owns the request
    if (requestOwnerId && typeof requestOwnerId === "string") {
      broadcastToUserAndAdmins(
        requestOwnerId,
        "DELIVERY_STATUS_CHANGED",
        {
          requestId,
          previousStatus: currentStatus,
          newStatus,
          note,
          message: `Your shipment status changed to: ${newStatus}`,
        },
        requestId,
      );
    }

    // Normalize response
    const normalizedRequest = {
      ...updatedRequest,
      id: updatedRequest._id.toString(),
    };

    return NextResponse.json(
      {
        success: true,
        request: normalizedRequest,
        message: `Delivery status updated to "${newStatus}"`,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * @swagger
 * /api/driver/delivery-status:
 *   get:
 *     summary: Get available delivery status transitions for a request
 *     tags: [Driver]
 *     parameters:
 *       - in: query
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available transitions
 *       404:
 *         description: Request not found
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get("requestId");
    const driverId = searchParams.get("driverId");

    if (!requestId || !driverId) {
      return NextResponse.json(
        { error: "requestId and driverId are required" },
        { status: 400 },
      );
    }

    const existingRequest = await Request.findOne({
      _id: requestId,
      $or: [
        { assignedDriver: driverId },
        { "selectedDriver.id": driverId },
      ],
    }).lean();

    if (!existingRequest) {
      console.log(
        `[Delivery Status GET] Request not found for requestId: ${requestId}, driverId: ${driverId}`
      );
      return NextResponse.json(
        { error: "Request not found or you don't have permission" },
        { status: 404 },
      );
    }

    const currentStatus = existingRequest.deliveryStatus || "Pending";

    // Get valid transitions based on current status
    const availableTransitions = VALID_TRANSITIONS[currentStatus] || [];

    return NextResponse.json({
      currentStatus,
      availableTransitions,
    });
  } catch (error) {
    return handleError(error);
  }
}
