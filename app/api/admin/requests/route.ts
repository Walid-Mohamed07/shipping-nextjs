import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     summary: Get all shipping requests with detailed information
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all requests
 *       500:
 *         description: Failed to fetch requests
 *   put:
 *     summary: Update request or delivery status
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *               requestStatus:
 *                 type: string
 *               deliveryStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request updated successfully
 *       404:
 *         description: Request not found
 *       500:
 *         description: Failed to update request
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const filter: any = {};
    if (status) {
      filter.$or = [{ requestStatus: status }, { deliveryStatus: status }];
    }

    // Return all requests with populated user data
    const requests = await Request.find(filter)
      .populate("userId", "fullName email mobile profilePicture role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, requestStatus, deliveryStatus } = body;

    const updateData: any = {};
    if (requestStatus) updateData.requestStatus = requestStatus;
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;
    updateData.updatedAt = new Date();

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, request: updatedRequest },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}

    const requestIndex = requestsData.requests.findIndex(
      (r: any) => r.id === requestId,
    );
    if (requestIndex === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const currentRequest = requestsData.requests[requestIndex];
    const now = new Date().toISOString();
    const adminId = "admin-001"; // In real app, get from auth context

    if (requestStatus) {
      currentRequest.requestStatus = requestStatus;
      currentRequest.requestStatusHistory =
        currentRequest.requestStatusHistory || [];
      currentRequest.requestStatusHistory.push({
        status: requestStatus,
        changedAt: now,
        changedBy: adminId,
        role: "admin",
        note: null,
      });
      currentRequest.orderFlow = currentRequest.orderFlow || [];
      currentRequest.orderFlow.push(requestStatus);
      currentRequest.orderCompletedStatuses =
        currentRequest.orderCompletedStatuses || [];
      currentRequest.orderCompletedStatuses.push(requestStatus);
    }

    if (deliveryStatus) {
      currentRequest.deliveryStatus = deliveryStatus;
      currentRequest.deliveryStatusHistory =
        currentRequest.deliveryStatusHistory || [];
      currentRequest.deliveryStatusHistory.push({
        status: deliveryStatus,
        changedAt: now,
        changedBy: adminId,
        role: "operator",
        note: null,
      });
      currentRequest.deliveryFlow = currentRequest.deliveryFlow || [];
      currentRequest.deliveryFlow.push(deliveryStatus);
      currentRequest.deliveryCompletedStatuses =
        currentRequest.deliveryCompletedStatuses || [];
      currentRequest.deliveryCompletedStatuses.push(deliveryStatus);
    }

    currentRequest.updatedAt = now;

    if (requestStatus === "Rejected") {
      currentRequest.deliveryStatus = "Cancelled";
    }

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json(
      {
        success: true,
        request: currentRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}
