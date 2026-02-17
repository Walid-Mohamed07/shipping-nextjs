import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders/requests
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all orders
 *       500:
 *         description: Failed to fetch orders
 *   put:
 *     summary: Update order status
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *               requestStatus:
 *                 type: string
 *               deliveryStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated
 *       500:
 *         description: Failed to update order
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const orders = await Request.find({})
      .populate("userId", "email fullName")
      .lean();
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { orderId, requestStatus, deliveryStatus } = body;

    const updateData: any = {};
    if (requestStatus) updateData.requestStatus = requestStatus;
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;
    updateData.updatedAt = new Date();
    const adminId = "admin-001"; // In real app, get from auth context

    if (requestStatus) {
      currentOrder.requestStatus = requestStatus;
      currentOrder.requestStatusHistory =
        currentOrder.requestStatusHistory || [];
      currentOrder.requestStatusHistory.push({
        status: requestStatus,
        changedAt: now,
        changedBy: adminId,
        role: "admin",
        note: null,
      });
    }

    if (deliveryStatus) {
      currentOrder.deliveryStatus = deliveryStatus;
      currentOrder.deliveryStatusHistory =
        currentOrder.deliveryStatusHistory || [];
      currentOrder.deliveryStatusHistory.push({
        status: deliveryStatus,
        changedAt: now,
        changedBy: adminId,
        role: "admin",
        note: null,
      });
    }

    currentOrder.updatedAt = now;
    requestsData.requests[orderIndex] = currentOrder;

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json(
      { message: "Order updated successfully", order: currentOrder },
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
