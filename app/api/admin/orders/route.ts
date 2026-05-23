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
    const { requestStatus, deliveryStatus } = body;
    const orderId = body.orderId || body.requestId;
    const adminId = "admin-001"; // In real app, get from auth context

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const currentOrder = await Request.findById(orderId);
    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date();

    if (requestStatus && requestStatus !== currentOrder.requestStatus) {
      currentOrder.requestStatus = requestStatus;
      currentOrder.requestStatusHistory =
        currentOrder.requestStatusHistory || [];
      currentOrder.requestStatusHistory.push({
        status: requestStatus,
        timestamp: now,
        role: "admin",
        reason: null,
      });
      currentOrder.orderFlow = currentOrder.orderFlow || [];
      currentOrder.orderFlow.push(requestStatus);
      currentOrder.orderCompletedStatuses =
        currentOrder.orderCompletedStatuses || [];
      currentOrder.orderCompletedStatuses.push(requestStatus);
    }

    if (deliveryStatus && deliveryStatus !== currentOrder.deliveryStatus) {
      currentOrder.deliveryStatus = deliveryStatus;
      currentOrder.deliveryStatusHistory =
        currentOrder.deliveryStatusHistory || [];
      currentOrder.deliveryStatusHistory.push({
        status: deliveryStatus,
        timestamp: now,
        role: "admin",
        reason: null,
      });
      currentOrder.deliveryFlow = currentOrder.deliveryFlow || [];
      currentOrder.deliveryFlow.push(deliveryStatus);
      currentOrder.deliveryCompletedStatuses =
        currentOrder.deliveryCompletedStatuses || [];
      currentOrder.deliveryCompletedStatuses.push(deliveryStatus);
    }

    currentOrder.updatedAt = now;
    await currentOrder.save();

    return NextResponse.json(
      { message: "Order updated successfully", order: currentOrder },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return handleError(error);
  }
}
