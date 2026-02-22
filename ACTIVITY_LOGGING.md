# Activity Logging System

## Overview

The Activity Logging System provides comprehensive tracking of all request lifecycle events in the Shipping application. Each action is logged as an `activityHistory` entry on the request document in MongoDB.

## Activity Events Tracked

### Request Lifecycle

#### 1. **request_created** - Request Created

- **When**: User creates a new shipping request
- **Route**: `POST /api/requests`
- **Details**: User ID
- **Example Log**:
  ```
  "Request created by user"
  ```

#### 2. **request_updated** - Request Details Updated

- **When**: Request information is modified
- **Route**: `PUT /api/requests/[id]`
- **Details**: Field updates
- **Example Log**:
  ```
  "Request details updated"
  ```

### Offer Management

#### 3. **offer_submitted** - Cost Offer Submitted by Company

- **When**: A company submits a cost offer for a request
- **Route**: `POST /api/company/requests` (action: "add-offer")
- **Details**: Company ID, offer cost, comment
- **Company Info**: Name, rate
- **Example Log**:
  ```
  "John's Logistics submitted an offer of $150"
  Details: { companyId: "...", comment: "Quick delivery available" }
  ```

#### 4. **offer_updated** - Cost Offer Updated

- **When**: A company updates their existing offer
- **Route**: `POST /api/company/requests` (action: "add-offer")
- **Details**: Company ID, new offer cost, updated comment
- **Company Info**: Name, rate
- **Example Log**:
  ```
  "John's Logistics updated their offer to $120"
  ```

#### 5. **offer_accepted** - Offer Accepted by Client/Company

- **When**: Client accepts a company's offer
- **Route**: `POST /api/requests/[id]/submit-offer` OR `POST /api/company/accept-offer`
- **Details**: Company ID
- **Company Info**: Name, rate (if available)
- **Cost**: Accepted offer amount
- **Example Log**:
  ```
  "Client accepted offer from John's Logistics for $150"
  Details: { companyId: "..." }
  ```

#### 6. **offer_rejected** - Offer Rejected

- **When**: Client rejects a company's offer (future implementation)
- **Details**: Company ID
- **Example Log**:
  ```
  "Client rejected offer from John's Logistics"
  ```

#### 7. **request_rejected_by_company** - Request Rejected by Company

- **When**: A company rejects/passes on a request
- **Route**: `POST /api/company/requests` (action: "reject-request")
- **Details**: Company ID
- **Company Info**: Name
- **Example Log**:
  ```
  "John's Logistics rejected this request"
  ```

### Status Changes

#### 8. **status_changed** - Request Status Changed

- **When**: Request status is updated (e.g., Pending → Accepted → Assigned)
- **Routes**:
  - `PUT /api/requests/manage`
  - `PUT /api/admin/requests`
- **Details**: Old status, new status
- **Example Log**:
  ```
  "Request status changed from 'Pending' to 'Accepted'"
  Details: { oldStatus: "Pending", newStatus: "Accepted" }
  ```

#### 9. **delivery_status_changed** - Delivery Status Changed

- **When**: Delivery progress status is updated
- **Routes**:
  - `PUT /api/requests/manage`
  - `PUT /api/admin/requests`
- **Details**: Old status, new status
- **Example Log**:
  ```
  "Delivery status changed from 'Pending' to 'Picked Up Source'"
  Details: { oldStatus: "Pending", newStatus: "Picked Up Source" }
  ```

### Warehouse Management

#### 10. **warehouse_assigned** - Warehouse Assigned

- **When**: Source or destination warehouse is assigned to request
- **Route**: `POST /api/company/assign-warehouse`
- **Details**: Warehouse ID, warehouse type (source/destination)
- **Example Log**:
  ```
  "Warehouse 'Cairo Main Warehouse' assigned as source location"
  Details: { warehouseId: "...", type: "source" }
  ```

## Activity History Schema

```typescript
interface ActivityHistory {
  timestamp: Date; // When the action occurred
  action: string; // Action type (e.g., "offer_submitted")
  description?: string; // Human-readable description
  companyName?: string; // Company involved (if applicable)
  companyRate?: string; // Company rating (if applicable)
  cost?: number; // Cost amount (for offer-related actions)
  details?: Record<string, any>; // Additional contextual data
}
```

## Usage in Frontend

### Displaying Activity History (Request Detail Page)

The activity history is displayed in a timeline format with all relevant details:

```typescript
// Access activity history from request object
{request.activityHistory && request.activityHistory.length > 0 ? (
  <div className="space-y-3">
    {[...request.activityHistory].reverse().map((activity, index) => (
      <div key={index} className="flex gap-3 text-sm border-l-2 border-primary pl-3">
        <div className="flex-1">
          {/* Action and timestamp */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium text-foreground">
              {activity.action.split("_").map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(" ")}
            </p>
            <time className="text-xs text-muted-foreground">
              {new Date(activity.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>

          {/* Description */}
          {activity.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {activity.description}
            </p>
          )}

          {/* Company, cost, and rate information */}
          <div className="flex flex-wrap gap-3 mt-2">
            {activity.companyName && (
              <div className="text-xs">
                <span className="text-muted-foreground">Company: </span>
                <span className="font-medium">{activity.companyName}</span>
              </div>
            )}
            {activity.cost !== undefined && (
              <div className="text-xs">
                <span className="text-muted-foreground">Cost: </span>
                <span className="text-primary font-semibold">
                  ${Number(activity.cost).toFixed(2)}
                </span>
              </div>
            )}
            {activity.companyRate && (
              <div className="text-xs">
                <span className="text-muted-foreground">Rate: </span>
                <span>{activity.companyRate} ⭐</span>
              </div>
            )}
          </div>

          {/* Additional details (expandable) */}
          {activity.details && Object.keys(activity.details).length > 0 && (
            <details className="text-xs mt-2 p-2 bg-muted/30 rounded cursor-pointer">
              <summary className="font-medium">More details</summary>
              <pre className="mt-1 text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(activity.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    ))}
  </div>
) : (
  <p>No activity recorded yet.</p>
)}
```

### Activity History in Admin Dashboard

The admin component displays activity history in a card-based layout with all information visible:

```typescript
{selectedRequest.activityHistory && selectedRequest.activityHistory.length > 0 && (
  <div className="space-y-3">
    <h3 className="font-semibold">📋 Activity History</h3>
    {selectedRequest.activityHistory.slice().reverse().map((activity, idx) => (
      <div key={idx} className="p-4 bg-muted/40 rounded-lg border border-border">
        {/* Action and timestamp */}
        <div className="flex justify-between items-baseline">
          <p className="font-semibold">
            {activity.action.replace(/_/g, " ").toUpperCase()}
          </p>
          <span className="text-xs text-muted-foreground">
            📅 {new Date(activity.timestamp).toLocaleString()}
          </span>
        </div>

        {/* Description */}
        {activity.description && (
          <p className="text-muted-foreground mt-2">{activity.description}</p>
        )}

        {/* Details in grid */}
        {(activity.companyName || activity.cost || activity.companyRate) && (
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            {activity.companyName && (
              <div>
                <span className="text-muted-foreground">Company: </span>
                <span className="font-medium">{activity.companyName}</span>
              </div>
            )}
            {activity.cost !== undefined && (
              <div>
                <span className="text-muted-foreground">Cost: </span>
                <span className="text-primary font-semibold">
                  ${Number(activity.cost).toFixed(2)}
                </span>
              </div>
            )}
            {activity.companyRate && (
              <div>
                <span className="text-muted-foreground">Rate: </span>
                <span>{activity.companyRate} ⭐</span>
              </div>
            )}
          </div>
        )}

        {/* Expandable additional details */}
        {activity.details && Object.keys(activity.details).length > 0 && (
          <details className="text-xs mt-3 cursor-pointer">
            <summary className="font-medium hover:text-primary">
              ⚙️ Additional Details
            </summary>
            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
              {JSON.stringify(activity.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
    ))}
  </div>
)}
```

### Timeline View

The activity history can be displayed as a timeline showing the complete journey of a request from creation to completion.

## API Helper Functions

The `lib/activityLogger.ts` file provides utility functions for adding activity logs:

```typescript
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";

// Add a custom activity
await addActivityLog(requestId, {
  action: "custom_action",
  description: "Custom description",
  details: { customData: "value" },
});

// Use predefined activity builders
await addActivityLog(
  requestId,
  ActivityActions.OFFER_SUBMITTED(companyId, "Company Name", 150, "comment"),
);
```

## Implementation Checklist

Routes with Activity Logging:

- ✅ POST `/api/requests` - Request creation
- ✅ PUT `/api/requests/manage` - Status updates
- ✅ PUT `/api/admin/requests` - Admin status updates
- ✅ POST `/api/company/requests` - Offer submission & rejection
- ✅ POST `/api/requests/[id]/submit-offer` - Client accept offer
- ✅ POST `/api/company/accept-offer` - Company accept offer
- ✅ POST `/api/company/assign-warehouse` - Warehouse assignment

## Future Enhancements

Potential activities to track in the future:

- Payment processed/completed
- Document uploaded
- Message sent between parties
- Request cancelled
- Dispute created/resolved
- Rating/review submitted
- Insurance added/removed

## Database Considerations

- Activity history is stored as embedded documents in the Request model
- Each entry includes a timestamp for audit purposes
- The `details` field can store flexible JSON data for different action types
- Activity history is immutable once created (never updated/deleted)

## Monitoring & Analytics

The activity history enables:

- Request lifecycle analytics
- Company performance tracking
- User behavior analysis
- Audit trails for compliance
- Issue investigation and troubleshooting
