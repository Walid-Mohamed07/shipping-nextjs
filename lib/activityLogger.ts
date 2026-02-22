import { Request } from "@/lib/models";

export interface ActivityLogEntry {
  action: string;
  timestamp?: Date;
  description?: string;
  companyName?: string;
  companyRate?: string;
  cost?: number;
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
            companyName: activity.companyName,
            companyRate: activity.companyRate,
            cost: activity.cost,
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
    companyId: string,
    companyName: string,
    cost: number,
    comment?: string,
  ) => ({
    action: "offer_submitted",
    description: `${companyName} submitted an offer of $${cost}`,
    companyName,
    cost,
    details: { companyId, comment },
  }),

  OFFER_UPDATED: (
    companyId: string,
    companyName: string,
    cost: number,
    comment?: string,
  ) => ({
    action: "offer_updated",
    description: `${companyName} updated their offer to $${cost}`,
    companyName,
    cost,
    details: { companyId, comment },
  }),

  OFFER_ACCEPTED: (
    companyId: string,
    companyName: string,
    cost: number,
    rate?: string,
  ) => ({
    action: "offer_accepted",
    description: `Client accepted offer from ${companyName} for $${cost}`,
    companyName,
    cost,
    companyRate: rate,
    details: { companyId },
  }),

  OFFER_REJECTED: (companyId: string, companyName: string) => ({
    action: "offer_rejected",
    description: `Client rejected offer from ${companyName}`,
    companyName,
    details: { companyId },
  }),

  REQUEST_REJECTED_BY_COMPANY: (companyId: string, companyName: string) => ({
    action: "request_rejected_by_company",
    description: `${companyName} rejected this request`,
    companyName,
    details: { companyId },
  }),

  // Warehouse management
  WAREHOUSE_ASSIGNED: (
    warehouseId: string,
    warehouseName: string,
    type: "source" | "destination",
  ) => ({
    action: "warehouse_assigned",
    description: `Warehouse "${warehouseName}" assigned as ${type} location`,
    details: { warehouseId, type },
  }),

  // Status changes
  STATUS_CHANGED: (oldStatus: string, newStatus: string) => ({
    action: "status_changed",
    description: `Request status changed from "${oldStatus}" to "${newStatus}"`,
    details: { oldStatus, newStatus },
  }),

  DELIVERY_STATUS_CHANGED: (oldStatus: string, newStatus: string) => ({
    action: "delivery_status_changed",
    description: `Delivery status changed from "${oldStatus}" to "${newStatus}"`,
    details: { oldStatus, newStatus },
  }),
};
