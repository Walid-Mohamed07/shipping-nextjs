import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";

/**
 * Delivery Status Flow:
 * 
 * 1. Pending - Initial state
 * 2. Picked Up Source - Items collected from source (Delegate) or dropped off by customer (Self)
 * 3. Warehouse Source Received - Items at source warehouse
 * 4. In Transit - Items moving between locations
 * 5. Warehouse Destination Received - Items at destination warehouse
 * 6. Shipment Deliver - Out for final delivery (Delegate) or ready for pickup (Self)
 * 7. Delivered - Complete
 */

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ["Picked Up Source", "Warehouse Source Received"],
  "Picked Up Source": ["Warehouse Source Received"],
  "Warehouse Source Received": ["In Transit"],
  "In Transit": ["Warehouse Destination Received", "Shipment Deliver"],
  "Warehouse Destination Received": ["Shipment Deliver", "Delivered"],
  "Shipment Deliver": ["Delivered"],
  Delivered: [],
  Failed: [],
};

/**
 * @swagger
 * /api/company/delivery-status:
 *   put:
 *     summary: Update delivery status for a request (company only)
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId, companyId, newStatus]
 *             properties:
 *               requestId:
 *                 type: string
 *               companyId:
 *                 type: string
 *               newStatus:
 *                 type: string
 *                 enum: [Pending, Picked Up Source, Warehouse Source Received, In Transit, Warehouse Destination Received, Shipment Deliver, Delivered, Failed]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Unauthorized - request not assigned to this company
 *       404:
 *         description: Request not found
 *       500:
 *         description: Failed to update status
 */

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, companyId, newStatus, note } = body;

    if (!requestId || !companyId || !newStatus) {
      return NextResponse.json(
        { error: "requestId, companyId, and newStatus are required" },
        { status: 400 },
      );
    }

    // Find the request and verify it's assigned to this company
    const existingRequest = await Request.findOne({
      _id: requestId,
      assignedCompanyId: companyId,
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found or you don't have permission to update it" },
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
      role: "company",
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
 * /api/company/delivery-status:
 *   get:
 *     summary: Get available delivery status transitions for a request
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
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
    const companyId = searchParams.get("companyId");

    if (!requestId || !companyId) {
      return NextResponse.json(
        { error: "requestId and companyId are required" },
        { status: 400 },
      );
    }

    const existingRequest = await Request.findOne({
      _id: requestId,
      assignedCompanyId: companyId,
    }).lean();

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found or you don't have permission" },
        { status: 404 },
      );
    }

    const currentStatus = existingRequest.deliveryStatus || "Pending";
    const sourceMode = existingRequest.sourcePickupMode || existingRequest.source?.pickupMode;
    const destMode = existingRequest.destinationPickupMode || existingRequest.destination?.pickupMode;
    
    // Get valid transitions based on current status
    let availableTransitions = VALID_TRANSITIONS[currentStatus] || [];

    // Filter transitions based on pickup modes
    // If source is Self (customer drops off), skip "Picked Up Source" and go to warehouse
    // If dest is Self (customer picks up), skip "Shipment Deliver" scenario
    
    return NextResponse.json({
      currentStatus,
      availableTransitions,
      sourcePickupMode: sourceMode,
      destinationPickupMode: destMode,
      hasSourceWarehouse: !!existingRequest.sourceWarehouse,
      hasDestinationWarehouse: !!existingRequest.destinationWarehouse,
    });
  } catch (error) {
    return handleError(error);
  }
}
