"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRealTime, RealTimeEventType, RealTimeEvent } from "@/app/context/RealTimeContext";

interface UseLiveDataOptions<T> {
  /**
   * The API endpoint to fetch data from
   */
  endpoint: string;
  
  /**
   * Event types that should trigger a data refresh
   */
  eventTypes?: RealTimeEventType[];
  
  /**
   * If provided, only refresh when events match this request ID
   */
  requestId?: string;
  
  /**
   * Optional transform function for the fetched data
   */
  transform?: (data: any) => T;
  
  /**
   * Disable automatic fetching on mount
   */
  skipInitialFetch?: boolean;
  
  /**
   * Debounce refresh calls (in milliseconds)
   */
  debounceMs?: number;
  
  /**
   * Dependencies that should trigger a refetch when changed
   */
  dependencies?: any[];
  
  /**
   * Callback when data is updated
   */
  onUpdate?: (data: T) => void;
  
  /**
   * Callback when an event is received (before refresh)
   */
  onEvent?: (event: RealTimeEvent) => void;
}

interface UseLiveDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isConnected: boolean;
  lastUpdated: Date | null;
}

/**
 * Hook for fetching data that automatically refreshes on real-time events
 * 
 * @example
 * const { data: requests, isLoading, refresh } = useLiveData<Request[]>({
 *   endpoint: `/api/requests?userId=${userId}`,
 *   eventTypes: ['REQUEST_CREATED', 'REQUEST_UPDATED', 'OFFER_SUBMITTED'],
 * });
 */
export function useLiveData<T = any>(options: UseLiveDataOptions<T>): UseLiveDataResult<T> {
  const {
    endpoint,
    eventTypes = [],
    requestId,
    transform,
    skipInitialFetch = false,
    debounceMs = 300,
    dependencies = [],
    onUpdate,
    onEvent,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { subscribe, subscribeToRequest, isConnected } = useRealTime();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch data from endpoint
  const fetchData = useCallback(async () => {
    if (!endpoint) return;

    try {
      setIsLoading(true);
      setError(null);

      // Attach token from localStorage as a fallback when the HTTP-only
      // cookie is missing (e.g. expired while user object remains in ls)
      const lsToken =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token_ls")
          : null;
      const headers: Record<string, string> = {};
      if (lsToken) headers["Authorization"] = `Bearer ${lsToken}`;

      const response = await fetch(endpoint, {
        credentials: "include", // send the auth_token HTTP-only cookie
        headers,
      });

      // 401/403 = unauthenticated / session expired — not a hard error
      if (response.status === 401 || response.status === 403) {
        if (isMountedRef.current) {
          setData(null);
          setError(null); // don't surface auth errors to UI noise
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      const transformedData = transform ? transform(result) : result;

      if (isMountedRef.current) {
        setData(transformedData);
        setLastUpdated(new Date());
        onUpdate?.(transformedData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
        setError(errorMessage);
        console.error("[useLiveData] Fetch error:", errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [endpoint, transform, onUpdate]);

  // Debounced refresh function
  const refresh = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (debounceMs > 0) {
      debounceTimeoutRef.current = setTimeout(() => {
        fetchData();
      }, debounceMs);
    } else {
      await fetchData();
    }
  }, [fetchData, debounceMs]);

  // Handle real-time events
  const handleEvent = useCallback((event: RealTimeEvent) => {
    onEvent?.(event);
    refresh();
  }, [onEvent, refresh]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Subscribe to specific event types
    if (eventTypes.length > 0) {
      const unsubscribe = subscribe(eventTypes, handleEvent);
      unsubscribers.push(unsubscribe);
    }

    // Subscribe to request-specific events
    if (requestId) {
      const unsubscribe = subscribeToRequest(requestId, handleEvent);
      unsubscribers.push(unsubscribe);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [eventTypes.join(","), requestId, subscribe, subscribeToRequest, handleEvent]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (!skipInitialFetch) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [endpoint, skipInitialFetch, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    refresh,
    isConnected,
    lastUpdated,
  };
}

/**
 * Hook for subscribing to real-time events without data fetching
 * 
 * @example
 * useLiveEvent(['REQUEST_UPDATED'], (event) => {
 *   console.log('Request updated:', event.payload);
 * });
 */
export function useLiveEvent(
  eventTypes: RealTimeEventType | RealTimeEventType[],
  callback: (event: RealTimeEvent) => void,
  requestId?: string
) {
  const { subscribe, subscribeToRequest } = useRealTime();

  useEffect(() => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const unsubscribers: (() => void)[] = [];

    if (types.length > 0) {
      const unsubscribe = subscribe(types, callback);
      unsubscribers.push(unsubscribe);
    }

    if (requestId) {
      const unsubscribe = subscribeToRequest(requestId, callback);
      unsubscribers.push(unsubscribe);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [Array.isArray(eventTypes) ? eventTypes.join(",") : eventTypes, requestId, callback, subscribe, subscribeToRequest]);
}

/**
 * Hook for auto-refreshing a request's data
 * 
 * @example
 * const { data: request, isLoading } = useLiveRequest(requestId);
 */
export function useLiveRequest(requestId: string | undefined) {
  return useLiveData({
    endpoint: requestId ? `/api/requests/${requestId}` : "",
    requestId,
    eventTypes: [
      "REQUEST_UPDATED",
      "OFFER_SUBMITTED",
      "OFFER_ACCEPTED",
      "OFFER_REJECTED",
      "OFFER_UPDATED",
      "STATUS_CHANGED",
      "ASSIGNMENT_UPDATED",
      "WAREHOUSE_ASSIGNED",
      "DRIVER_ASSIGNED",
      "DELIVERY_STATUS_CHANGED",
      "TRACKING_UPDATED",
    ],
    transform: (data) => data.request || data,
    skipInitialFetch: !requestId,
  });
}

/**
 * Hook for auto-refreshing a list of requests
 * 
 * @example
 * const { data: requests, isLoading } = useLiveRequests(userId);
 */
export function useLiveRequests(userId: string | undefined, additionalParams?: string) {
  const baseEndpoint = userId ? `/api/requests?userId=${userId}` : "";
  const endpoint = additionalParams ? `${baseEndpoint}&${additionalParams}` : baseEndpoint;

  return useLiveData({
    endpoint,
    eventTypes: [
      "REQUEST_CREATED",
      "REQUEST_UPDATED",
      "REQUEST_DELETED",
      "OFFER_SUBMITTED",
      "OFFER_ACCEPTED",
      "STATUS_CHANGED",
    ],
    transform: (data) => data.requests || data,
    skipInitialFetch: !userId,
  });
}

/**
 * Hook for auto-refreshing company requests
 */
export function useLiveCompanyRequests(companyId: string | undefined) {
  return useLiveData({
    endpoint: companyId ? `/api/company/requests?companyId=${companyId}` : "",
    eventTypes: [
      "REQUEST_CREATED",
      "REQUEST_UPDATED",
      "OFFER_SUBMITTED",
      "OFFER_ACCEPTED",
      "OFFER_REJECTED",
      "STATUS_CHANGED",
    ],
    transform: (data) => data.requests || data,
    skipInitialFetch: !companyId,
  });
}

/**
 * Hook for messages with live updates
 */
export function useLiveMessages(userId: string | undefined, conversationId?: string) {
  const endpoint = conversationId 
    ? `/api/messages?conversationId=${conversationId}`
    : userId 
      ? `/api/messages?userId=${userId}`
      : "";

  return useLiveData({
    endpoint,
    eventTypes: ["MESSAGE_RECEIVED", "MESSAGE_SENT"],
    transform: (data) => data.messages || data,
    skipInitialFetch: !userId,
    debounceMs: 100, // Faster updates for messages
  });
}
