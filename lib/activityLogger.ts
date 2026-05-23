import { Request } from "@/lib/models";

export interface ActivityLogEntry {
  action: string;
  timestamp?: Date;
  description?: string;
  driverName?: string;
  driverRate?: string;
  cost?: number;
  currency?: string;
  details?: Record<string, any>;
}

/**
 * Add an activity history entry to a request
 */
export async function addActivityLog(
  requestId: string,
  activity: ActivityLogEntry,
) {
  try {
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        $push: {
          activityHistory: {
            action: activity.action,
            timestamp: activity.timestamp || new Date(),
            description: activity.description,
            driverName: activity.driverName,
            driverRate: activity.driverRate,
            cost: activity.cost,
            currency: activity.currency,
            details: activity.details,
          },
        },
      },
      { returnDocument: "after" },
    );
    return updatedRequest;
  } catch (error) {
    console.error(`Error adding activity log: ${error}`);
    throw error;
  }
}

/**
 * Activity log builders for common operations
 */
export const ActivityActions = {
  // Request lifecycle
  REQUEST_CREATED: (userId: string) => ({
    action: "request_created",
    description: `Request created by user`,
    details: { userId },
  }),

  REQUEST_UPDATED: (updates: Record<string, any>) => ({
    action: "request_updated",
    description: `Request details updated`,
    details: updates,
  }),

  // Offer management
  OFFER_SUBMITTED: (
    driverId: string,
    driverName: string,
    cost: number,
    comment?: string,
    currency?: string,
  ) => ({
    action: "offer_submitted",
    description: `${driverName} submitted an offer of ${cost} ${currency || "USD"}`,
    driverName,
    cost,
    currency: currency || "USD",
    details: { driverId, comment },
  }),

  OFFER_UPDATED: (
    driverId: string,
    driverName: string,
    cost: number,
    comment?: string,
    currency?: string,
  ) => ({
    action: "offer_updated",
    description: `${driverName} updated their offer to ${cost} ${currency || "USD"}`,
    driverName,
    cost,
    currency: currency || "USD",
    details: { driverId, comment },
  }),

  OFFER_ACCEPTED: (
    driverId: string,
    driverName: string,
    cost: number,
    rate?: string,
    currency?: string,
  ) => ({
    action: "offer_accepted",
    description: `Client accepted offer from ${driverName} for ${cost} ${currency || "USD"}`,
    driverName,
    cost,
    currency: currency || "USD",
    driverRate: rate,
    details: { driverId },
  }),

  OFFER_REJECTED: (driverId: string, driverName: string) => ({
    action: "offer_rejected",
    description: `Client rejected offer from ${driverName}`,
    driverName,
    details: { driverId },
  }),

  REQUEST_REJECTED_BY_DRIVER: (driverId: string, driverName: string) => ({
    action: "request_rejected_by_driver",
    description: `${driverName} rejected this request`,
    driverName,
    details: { driverId },
  }),

  // Status changes
  STATUS_CHANGED: (oldStatus: string, newStatus: string) => ({
    action: "status_changed",
    description: `Request status changed from "${oldStatus}" to "${newStatus}"`,
    details: { oldStatus, newStatus },
  }),

  DELIVERY_STATUS_CHANGED: (
    oldStatus: string,
    newStatus: string,
    note?: string,
  ) => ({
    action: "delivery_status_changed",
    description: note
      ? `Delivery status changed from "${oldStatus}" to "${newStatus}". Note: ${note}`
      : `Delivery status changed from "${oldStatus}" to "${newStatus}"`,
    details: { oldStatus, newStatus, note },
  }),
};
