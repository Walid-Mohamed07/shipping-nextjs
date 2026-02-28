import { NextRequest, NextResponse } from "next/server";
import { broadcastEvent, eventBroadcaster } from "@/lib/eventBroadcaster";
import { RealTimeEventType } from "@/app/context/RealTimeContext";

/**
 * API endpoint to trigger broadcast events
 * This can be called by other API routes or for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, targetUsers, targetRoles, requestId, userId } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Event type is required" },
        { status: 400 }
      );
    }

    // Broadcast the event
    broadcastEvent(type as RealTimeEventType, payload || {}, {
      targetUsers,
      targetRoles,
      requestId,
      userId,
    });

    return NextResponse.json({
      success: true,
      clientsConnected: eventBroadcaster.getClientCount(),
    });
  } catch (error) {
    console.error("[Broadcast API] Error:", error);
    return NextResponse.json(
      { error: "Failed to broadcast event" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check connection status
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    clientsConnected: eventBroadcaster.getClientCount(),
    clients: eventBroadcaster.getClientInfo(),
  });
}
