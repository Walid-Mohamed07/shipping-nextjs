# Real-Time Updates System

This document explains how the real-time update system works in ShipHub.

## Overview

ShipHub uses **Server-Sent Events (SSE)** to provide real-time updates across the entire application. When any action is taken (creating requests, submitting offers, changing status, etc.), all connected users receive instant updates without needing to refresh the page.

## Architecture

### Components

1. **RealTimeContext** (`app/context/RealTimeContext.tsx`)
   - React context provider that manages SSE connections
   - Handles automatic reconnection with exponential backoff
   - Provides subscription APIs for components

2. **Event Broadcaster** (`lib/eventBroadcaster.ts`)
   - Server-side singleton that manages connected clients
   - Routes events to appropriate users based on roles/IDs
   - Handles heartbeat to keep connections alive

3. **SSE API Endpoint** (`app/api/realtime/events/route.ts`)
   - Server-Sent Events endpoint
   - Clients connect here to receive real-time updates

4. **useLiveData Hook** (`app/hooks/useLiveData.ts`)
   - Custom hook for fetching data with automatic real-time refresh
   - Convenience hooks: `useLiveRequest`, `useLiveRequests`, `useLiveCompanyRequests`

## Event Types

| Event Type | Description | Target Roles |
|------------|-------------|--------------|
| `REQUEST_CREATED` | New shipping request created | admin, operator, company |
| `REQUEST_UPDATED` | Request details updated | admin, operator, company, client (owner) |
| `REQUEST_DELETED` | Request deleted | admin, operator |
| `OFFER_SUBMITTED` | Company submitted an offer | admin, operator, client (owner) |
| `OFFER_ACCEPTED` | Client accepted an offer | admin, operator, company (accepted) |
| `OFFER_REJECTED` | Offer was rejected | company (rejected) |
| `OFFER_UPDATED` | Company updated their offer | admin, operator, client (owner) |
| `STATUS_CHANGED` | Request status changed | all relevant parties |
| `DELIVERY_STATUS_CHANGED` | Delivery progress updated | admin, operator, company, client (owner) |
| `WAREHOUSE_ASSIGNED` | Warehouse assigned to request | admin, operator, company, client |
| `DRIVER_ASSIGNED` | Driver assigned to request | admin, operator, company, driver |
| `MESSAGE_RECEIVED` | New message received | recipient |
| `MESSAGE_SENT` | Message sent | sender |
| `TRACKING_UPDATED` | Live tracking update | client (owner), admin |

## Usage

### In Components (Automatic Data Refresh)

```tsx
import { useLiveData, useLiveRequest, useLiveRequests } from "@/app/hooks/useLiveData";

// For a single request with live updates
function RequestPage({ requestId }) {
  const { data: request, isLoading, refresh, isConnected } = useLiveRequest(requestId);
  
  // Data automatically refreshes when relevant events occur
  return <div>{request?.status}</div>;
}

// For a list of requests
function MyRequestsPage({ userId }) {
  const { data: requests, isLoading, isConnected } = useLiveRequests(userId);
  
  return (
    <div>
      {requests?.map(req => <RequestCard key={req.id} request={req} />)}
    </div>
  );
}

// Custom live data fetch
function CustomData() {
  const { data, isLoading, refresh, isConnected } = useLiveData({
    endpoint: "/api/custom-endpoint",
    eventTypes: ["REQUEST_CREATED", "REQUEST_UPDATED"],
    transform: (data) => data.items,
    debounceMs: 500, // Debounce refresh calls
  });
}
```

### Listening to Events (Without Data Fetch)

```tsx
import { useLiveEvent } from "@/app/hooks/useLiveData";
import { toast } from "sonner";

function NotificationHandler() {
  useLiveEvent(
    ["OFFER_SUBMITTED", "OFFER_ACCEPTED"],
    (event) => {
      if (event.type === "OFFER_SUBMITTED") {
        toast.info("New offer received!", {
          description: `${event.payload.companyName} submitted $${event.payload.cost}`,
        });
      }
    }
  );
  
  return null;
}
```

### Using the Context Directly

```tsx
import { useRealTime } from "@/app/context/RealTimeContext";

function MyComponent() {
  const { 
    isConnected,      // Boolean: is SSE connected
    lastEvent,        // Last received event
    subscribe,        // Subscribe to event types
    subscribeToRequest, // Subscribe to request-specific events
    triggerRefresh,   // Manually trigger a refresh
    connectionStatus, // "connecting" | "connected" | "disconnected" | "error"
  } = useRealTime();
  
  return (
    <div>
      {isConnected ? "🟢 Live" : "🟡 Connecting..."}
    </div>
  );
}
```

### Broadcasting Events (API Routes)

```typescript
import { 
  broadcastEvent, 
  broadcastToAdmins, 
  broadcastToCompanies,
  broadcastToUserAndAdmins 
} from "@/lib/eventBroadcaster";

// In your API route after making changes:
export async function POST(request: NextRequest) {
  // ... make database changes ...
  
  // Broadcast to specific roles
  broadcastEvent("REQUEST_CREATED", {
    requestId: newRequest._id.toString(),
    userId: userId,
  }, {
    targetRoles: ["admin", "operator", "company"],
    requestId: newRequest._id.toString(),
  });
  
  // Broadcast to specific user and all admins
  broadcastToUserAndAdmins(userId, "OFFER_SUBMITTED", {
    requestId,
    companyName: "Company Inc",
    cost: 500,
  }, requestId);
  
  // Broadcast only to admins/operators
  broadcastToAdmins("STATUS_CHANGED", {
    requestId,
    newStatus: "Accepted",
  });
  
  return NextResponse.json({ success: true });
}
```

## Connection Status Indicator

A visual indicator shows whether real-time updates are active:

```tsx
import { Wifi, WifiOff } from "lucide-react";
import { useRealTime } from "@/app/context/RealTimeContext";

function ConnectionStatus() {
  const { isConnected } = useRealTime();
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      isConnected 
        ? "bg-green-100 text-green-700" 
        : "bg-yellow-100 text-yellow-700"
    }`}>
      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isConnected ? "Live" : "..."}
    </div>
  );
}
```

## Debugging

### Check Connected Clients

```bash
# GET request to see connected clients
curl http://localhost:3000/api/realtime/broadcast
```

### Manually Broadcast Event

```bash
# POST to broadcast an event
curl -X POST http://localhost:3000/api/realtime/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "type": "REQUEST_UPDATED",
    "payload": { "requestId": "123", "test": true },
    "targetRoles": ["admin"]
  }'
```

## Best Practices

1. **Use specific event types** - Don't broadcast generic events; use specific types like `OFFER_SUBMITTED` instead of `UPDATE`

2. **Include request IDs** - Always include `requestId` in options so subscribers can filter by request

3. **Target appropriately** - Use `targetUsers` for user-specific events and `targetRoles` for role-based events

4. **Debounce refreshes** - The `useLiveData` hook debounces by default (300ms). Adjust if needed.

5. **Handle disconnections** - The system auto-reconnects, but show users the connection status

6. **Don't over-broadcast** - Only broadcast what's necessary; excessive events can impact performance

## Troubleshooting

### Events not being received

1. Check if the user is connected (look at connection status indicator)
2. Verify `targetRoles` or `targetUsers` matches the receiving user
3. Check browser console for SSE connection errors

### Too many reconnects

- This usually means the server is restarting (during development)
- In production, ensure stable server deployment

### Events delayed

- Check `debounceMs` setting in `useLiveData` hook
- Network latency can cause delays
- Server under heavy load may slow down event processing
