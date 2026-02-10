import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    // Return requests/orders with user objects already populated
    return NextResponse.json(
      { orders: requestsData.requests },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, requestStatus, deliveryStatus } = body;

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const orderIndex = requestsData.requests.findIndex(
      (r: any) => r.id === orderId,
    );
    if (orderIndex === -1) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentOrder = requestsData.requests[orderIndex];
    const now = new Date().toISOString();
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
