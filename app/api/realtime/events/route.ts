import { NextRequest } from "next/server";
import { eventBroadcaster } from "@/lib/eventBroadcaster";

/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 * Clients connect here to receive live updates
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const role = searchParams.get("role") || "client";

  if (!userId) {
    return new Response(JSON.stringify({ error: "userId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Generate a unique client ID
  const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Register client with the broadcaster
      eventBroadcaster.addClient(clientId, userId, role, controller);
    },
    cancel() {
      // Client disconnected
      eventBroadcaster.removeClient(clientId);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
