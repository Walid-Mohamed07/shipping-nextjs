import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, User } from "@/lib/models";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import { broadcastEvent, broadcastToUserAndAdmins } from "@/lib/eventBroadcaster";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const filter: any = {};
    if (status) {
      filter.$or = [{ requestStatus: status }, { deliveryStatus: status }];
    }

    const results = await Request.find(filter)
      .populate("user", "fullName email mobile profilePicture role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests: results }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, requestStatus, deliveryStatus } = body;

    // Get current request to track status changes
    const currentRequest = await Request.findById(requestId);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (requestStatus) updateData.requestStatus = requestStatus;
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      updateData,
      {
        returnDocument: "after",
      },
    ).populate("user", "fullName email");

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Add activity logs for status changes
    if (requestStatus && requestStatus !== currentRequest.requestStatus) {
      await addActivityLog(
        requestId,
        ActivityActions.STATUS_CHANGED(
          currentRequest.requestStatus,
          requestStatus,
        ),
      );
      
      // Broadcast real-time event for status change
      const requestOwnerId = currentRequest.user?.toString() || currentRequest.user;
      broadcastEvent("STATUS_CHANGED", {
        requestId,
        previousStatus: currentRequest.requestStatus,
        newStatus: requestStatus,
      }, {
        requestId,
        targetRoles: ["admin", "operator", "driver"],
      });
      
      // Notify the client who owns the request
      if (requestOwnerId) {
        broadcastToUserAndAdmins(requestOwnerId, "STATUS_CHANGED", {
          requestId,
          previousStatus: currentRequest.requestStatus,
          newStatus: requestStatus,
        }, requestId);
      }
    }

    if (deliveryStatus && deliveryStatus !== currentRequest.deliveryStatus) {
      await addActivityLog(
        requestId,
        ActivityActions.DELIVERY_STATUS_CHANGED(
          currentRequest.deliveryStatus,
          deliveryStatus,
        ),
      );
      
      // Broadcast real-time event for delivery status change
      const requestOwnerId = currentRequest.user?.toString() || currentRequest.user;
      broadcastEvent("DELIVERY_STATUS_CHANGED", {
        requestId,
        previousStatus: currentRequest.deliveryStatus,
        newStatus: deliveryStatus,
      }, {
        requestId,
        targetRoles: ["admin", "operator", "driver"],
      });
      
      // Notify the client who owns the request
      if (requestOwnerId) {
        broadcastToUserAndAdmins(requestOwnerId, "DELIVERY_STATUS_CHANGED", {
          requestId,
          previousStatus: currentRequest.deliveryStatus,
          newStatus: deliveryStatus,
        }, requestId);
      }
    }

    return NextResponse.json(
      { success: true, request: updatedRequest },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
