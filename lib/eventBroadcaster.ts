/**
 * Real-time event broadcaster for Server-Sent Events (SSE)
 * This module manages client connections and broadcasts events to subscribers
 */

import { RealTimeEventType } from "@/app/context/RealTimeContext";

export interface BroadcastEvent {
  type: RealTimeEventType;
  payload: any;
  timestamp: number;
  targetUsers?: string[];
  targetRoles?: string[];
  requestId?: string;
  userId?: string;
}

interface ConnectedClient {
  id: string;
  userId: string;
  role: string;
  controller: ReadableStreamDefaultController;
  lastHeartbeat: number;
}

class EventBroadcaster {
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, id) => {
        try {
          this.sendToClient(client, { type: "heartbeat", timestamp: now });
          client.lastHeartbeat = now;
        } catch (err) {
          // Client disconnected, remove them
          console.log(`[Broadcaster] Removing disconnected client: ${id}`);
          this.clients.delete(id);
        }
      });
    }, 30000);
  }

  /**
   * Add a new client connection
   */
  addClient(
    clientId: string,
    userId: string,
    role: string,
    controller: ReadableStreamDefaultController
  ) {
    const client: ConnectedClient = {
      id: clientId,
      userId,
      role,
      controller,
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`[Broadcaster] Client connected: ${clientId} (userId: ${userId}, role: ${role}). Total clients: ${this.clients.size}`);

    // Send initial connection success event
    this.sendToClient(client, {
      type: "connected",
      clientId,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string) {
    this.clients.delete(clientId);
    console.log(`[Broadcaster] Client disconnected: ${clientId}. Total clients: ${this.clients.size}`);
  }

  /**
   * Send data to a specific client
   */
  private sendToClient(client: ConnectedClient, data: any) {
    try {
      const encoder = new TextEncoder();
      const message = `data: ${JSON.stringify(data)}\n\n`;
      client.controller.enqueue(encoder.encode(message));
    } catch (err) {
      console.error(`[Broadcaster] Error sending to client ${client.id}:`, err);
      throw err;
    }
  }

  /**
   * Broadcast an event to appropriate clients
   */
  broadcast(event: BroadcastEvent) {
    const { targetUsers, targetRoles } = event;

    this.clients.forEach((client) => {
      try {
        // Check if client should receive this event
        let shouldReceive = true;

        // If targetUsers is specified, check if client's user is in the list
        if (targetUsers && targetUsers.length > 0) {
          shouldReceive = targetUsers.includes(client.userId);
        }

        // If targetRoles is specified, check if client's role is in the list
        if (shouldReceive && targetRoles && targetRoles.length > 0) {
          shouldReceive = targetRoles.includes(client.role);
        }

        if (shouldReceive) {
          this.sendToClient(client, event);
        }
      } catch (err) {
        // Client disconnected, remove them
        console.log(`[Broadcaster] Removing failed client: ${client.id}`);
        this.clients.delete(client.id);
      }
    });
  }

  /**
   * Broadcast an event to all clients (no filtering)
   */
  broadcastToAll(event: BroadcastEvent) {
    this.clients.forEach((client) => {
      try {
        this.sendToClient(client, event);
      } catch (err) {
        this.clients.delete(client.id);
      }
    });
  }

  /**
   * Broadcast an event to a specific user
   */
  broadcastToUser(userId: string, event: BroadcastEvent) {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        try {
          this.sendToClient(client, event);
        } catch (err) {
          this.clients.delete(client.id);
        }
      }
    });
  }

  /**
   * Broadcast an event to all users with a specific role
   */
  broadcastToRole(role: string, event: BroadcastEvent) {
    this.clients.forEach((client) => {
      if (client.role === role) {
        try {
          this.sendToClient(client, event);
        } catch (err) {
          this.clients.delete(client.id);
        }
      }
    });
  }

  /**
   * Broadcast an event to multiple roles
   */
  broadcastToRoles(roles: string[], event: BroadcastEvent) {
    this.clients.forEach((client) => {
      if (roles.includes(client.role)) {
        try {
          this.sendToClient(client, event);
        } catch (err) {
          this.clients.delete(client.id);
        }
      }
    });
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get connected client info (for debugging)
   */
  getClientInfo(): { id: string; userId: string; role: string }[] {
    return Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      userId: c.userId,
      role: c.role,
    }));
  }
}

// Singleton instance
export const eventBroadcaster = new EventBroadcaster();

/**
 * Helper function to broadcast a real-time event
 * Use this in your API routes after making changes
 */
export function broadcastEvent(
  type: RealTimeEventType,
  payload: any,
  options?: {
    targetUsers?: string[];
    targetRoles?: string[];
    requestId?: string;
    userId?: string;
  }
) {
  const event: BroadcastEvent = {
    type,
    payload,
    timestamp: Date.now(),
    ...options,
  };

  eventBroadcaster.broadcast(event);
}

/**
 * Helper to broadcast request-related events
 */
export function broadcastRequestEvent(
  type: RealTimeEventType,
  requestId: string,
  payload: any,
  options?: {
    targetUsers?: string[];
    targetRoles?: string[];
    userId?: string;
  }
) {
  broadcastEvent(type, payload, {
    ...options,
    requestId,
  });
}

/**
 * Helper to broadcast to all admins and operators
 */
export function broadcastToAdmins(type: RealTimeEventType, payload: any, requestId?: string) {
  broadcastEvent(type, payload, {
    targetRoles: ["admin", "operator"],
    requestId,
  });
}

/**
 * Helper to broadcast to all companies
 */
export function broadcastToCompanies(type: RealTimeEventType, payload: any, requestId?: string) {
  broadcastEvent(type, payload, {
    targetRoles: ["company"],
    requestId,
  });
}

/**
 * Helper to broadcast to a specific user and all admins
 */
export function broadcastToUserAndAdmins(
  userId: string,
  type: RealTimeEventType,
  payload: any,
  requestId?: string
) {
  // Broadcast to admins
  broadcastToAdmins(type, payload, requestId);
  
  // Also broadcast to the specific user
  eventBroadcaster.broadcastToUser(userId, {
    type,
    payload,
    timestamp: Date.now(),
    requestId,
  });
}
