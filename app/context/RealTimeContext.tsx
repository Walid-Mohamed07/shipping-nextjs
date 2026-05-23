"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";

// Event types for different actions in the system
export type RealTimeEventType =
  | "REQUEST_CREATED"
  | "REQUEST_UPDATED"
  | "REQUEST_DELETED"
  | "OFFER_SUBMITTED"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "OFFER_UPDATED"
  | "STATUS_CHANGED"
  | "ASSIGNMENT_UPDATED"
  | "DRIVER_ASSIGNED"
  | "MESSAGE_RECEIVED"
  | "MESSAGE_SENT"
  | "USER_UPDATED"
  | "DRIVER_UPDATED"
  | "VEHICLE_UPDATED"
  | "DELIVERY_STATUS_CHANGED"
  | "TRACKING_UPDATED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "NOTIFICATION";

export interface RealTimeEvent<T = any> {
  type: RealTimeEventType;
  payload: T;
  timestamp: number;
  targetUsers?: string[]; // Specific users who should receive this event
  targetRoles?: string[]; // Roles that should receive this event (admin, driver, client, driver, operator)
  requestId?: string; // For request-specific events
  userId?: string; // The user who triggered the event
}

interface RealTimeContextType {
  isConnected: boolean;
  lastEvent: RealTimeEvent | null;
  subscribe: (
    eventType: RealTimeEventType | RealTimeEventType[],
    callback: (event: RealTimeEvent) => void,
  ) => () => void;
  subscribeToRequest: (
    requestId: string,
    callback: (event: RealTimeEvent) => void,
  ) => () => void;
  triggerRefresh: (eventType: RealTimeEventType, requestId?: string) => void;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(
  undefined,
);

// Store for subscribers
type SubscriberCallback = (event: RealTimeEvent) => void;

interface Subscribers {
  byEventType: Map<RealTimeEventType, Set<SubscriberCallback>>;
  byRequestId: Map<string, Set<SubscriberCallback>>;
  global: Set<SubscriberCallback>;
}

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");

  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Subscribers>({
    byEventType: new Map(),
    byRequestId: new Map(),
    global: new Set(),
  });
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Notify subscribers when an event is received
  const notifySubscribers = useCallback(
    (event: RealTimeEvent) => {
      const subscribers = subscribersRef.current;

      // Check if this event is targeted at the current user
      if (event.targetUsers && event.targetUsers.length > 0) {
        if (!user?.id || !event.targetUsers.includes(user.id)) {
          return; // Skip if user is not in target list
        }
      }

      // Check if this event is targeted at the current user's role
      if (event.targetRoles && event.targetRoles.length > 0) {
        if (!user?.role || !event.targetRoles.includes(user.role)) {
          return; // Skip if user's role is not in target list
        }
      }

      // Notify event type subscribers
      const typeSubscribers = subscribers.byEventType.get(event.type);
      if (typeSubscribers) {
        typeSubscribers.forEach((callback) => {
          try {
            callback(event);
          } catch (err) {
            console.error("Error in event subscriber:", err);
          }
        });
      }

      // Notify request-specific subscribers
      if (event.requestId) {
        const requestSubscribers = subscribers.byRequestId.get(event.requestId);
        if (requestSubscribers) {
          requestSubscribers.forEach((callback) => {
            try {
              callback(event);
            } catch (err) {
              console.error("Error in request subscriber:", err);
            }
          });
        }
      }

      // Notify global subscribers
      subscribers.global.forEach((callback) => {
        try {
          callback(event);
        } catch (err) {
          console.error("Error in global subscriber:", err);
        }
      });

      setLastEvent(event);
    },
    [user?.id, user?.role],
  );

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!user?.id) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus("connecting");

    const url = `/api/realtime/events?userId=${user.id}&role=${user.role}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
      console.log("[RealTime] Connected to event stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") {
          // Ignore heartbeat events
          return;
        }
        notifySubscribers(data);
      } catch (err) {
        console.error("[RealTime] Failed to parse event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[RealTime] Connection error:", err);
      setIsConnected(false);
      setConnectionStatus("error");
      eventSource.close();

      // Reconnect with exponential backoff
      const maxAttempts = 10;
      if (reconnectAttemptsRef.current < maxAttempts) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000,
        );
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(
            `[RealTime] Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`,
          );
          connect();
        }, delay);
      } else {
        setConnectionStatus("disconnected");
        console.log("[RealTime] Max reconnection attempts reached");
      }
    };

    return () => {
      eventSource.close();
    };
  }, [user?.id, user?.role, notifySubscribers]);

  // Connect when user logs in
  useEffect(() => {
    if (user?.id) {
      connect();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus("disconnected");
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.id, connect]);

  // Subscribe to specific event types
  const subscribe = useCallback(
    (
      eventType: RealTimeEventType | RealTimeEventType[],
      callback: SubscriberCallback,
    ) => {
      const types = Array.isArray(eventType) ? eventType : [eventType];
      const subscribers = subscribersRef.current;

      types.forEach((type) => {
        if (!subscribers.byEventType.has(type)) {
          subscribers.byEventType.set(type, new Set());
        }
        subscribers.byEventType.get(type)!.add(callback);
      });

      // Return unsubscribe function
      return () => {
        types.forEach((type) => {
          subscribers.byEventType.get(type)?.delete(callback);
        });
      };
    },
    [],
  );

  // Subscribe to events for a specific request
  const subscribeToRequest = useCallback(
    (requestId: string, callback: SubscriberCallback) => {
      const subscribers = subscribersRef.current;

      if (!subscribers.byRequestId.has(requestId)) {
        subscribers.byRequestId.set(requestId, new Set());
      }
      subscribers.byRequestId.get(requestId)!.add(callback);

      // Return unsubscribe function
      return () => {
        subscribers.byRequestId.get(requestId)?.delete(callback);
        if (subscribers.byRequestId.get(requestId)?.size === 0) {
          subscribers.byRequestId.delete(requestId);
        }
      };
    },
    [],
  );

  // Manually trigger a refresh (useful when you know data has changed)
  const triggerRefresh = useCallback(
    (eventType: RealTimeEventType, requestId?: string) => {
      const event: RealTimeEvent = {
        type: eventType,
        payload: { manual: true },
        timestamp: Date.now(),
        requestId,
      };
      notifySubscribers(event);
    },
    [notifySubscribers],
  );

  const value: RealTimeContextType = {
    isConnected,
    lastEvent,
    subscribe,
    subscribeToRequest,
    triggerRefresh,
    connectionStatus,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error("useRealTime must be used within a RealTimeProvider");
  }
  return context;
}
