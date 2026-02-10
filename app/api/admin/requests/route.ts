import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    // Return requests with user objects already populated
    return NextResponse.json(
      { requests: requestsData.requests },
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
    const { requestId, requestStatus, deliveryStatus } = body;

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

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
