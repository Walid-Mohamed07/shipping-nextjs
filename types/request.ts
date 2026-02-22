import { Address } from "./address";
import { User } from "./user";

export type RequestStatus =
  | "Accepted"
  | "Pending"
  | "Rejected"
  | "Cancelled"
  | "Action needed"
  | "Assigned to Company"
  | "In Progress"
  | "Completed";

export enum RequestDeliveryStatus {
  PENDING = "Pending",
  PICKED_UP_SOURCE = "Picked Up Source",
  WAREHOUSE_SOURCE_RECEIVED = "Warehouse Source Received",
  IN_TRANSIT = "In Transit",
  WAREHOUSE_DESTINATION_RECEIVED = "Warehouse Destination Received",
  SHIPMENT_DELIVER = "Shipment Deliver",
  DELIVERED = "Delivered",
  FAILED = "Failed",
}

export type DeliveryStatus = RequestDeliveryStatus;
export type PickupMode = "Delegate" | "Self";
export type DeliveryType = "Normal" | "Urgent";

// User info returned in populated responses
export interface UserDetails {
  _id?: string;
  id?: string;
  fullName: string;
  email: string;
  mobile?: string;
  profilePicture?: string;
  role?: string;
  username?: string;
}

export interface MediaItem {
  url: string;
  existing: boolean;
}

export interface Item {
  _id?: string;
  item?: string;
  name?: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
  note?: string;
  media?: MediaItem[];
  mediaFiles?: File[]; // Temporary storage for files before upload
  services?: {
    canBeAssembledDisassembled?: boolean;
    assemblyDisassemblyHandler?: "self" | "company";
    packaging?: boolean;
    // Backward compatibility
    assemblyDisassembly?: boolean;
  };
}

export interface ShippingItem {
  item: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
}

export interface RequestServices {
  assemblyDisassembly: boolean;
  packaging: boolean;
}

export interface CostOffer {
  cost: number;
  company: {
    id: string;
    name: string;
    phoneNumber: string;
    email: string;
    address: string;
    rate: string;
  };
  comment?: string;
  selected: boolean;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}

export interface ActivityHistory {
  timestamp: string;
  action: string;
  description: string;
  companyName?: string;
  companyRate?: string;
  cost?: number;
  details?: Record<string, any>;
}

export interface Request {
  id?: string;
  _id: string;
  user: string | UserDetails | User; // Can be string ID, populated UserDetails, or full User
  source: Address;
  destination: Address;
  from?: Address;
  to?: Address;
  items: Item[];
  deliveryType: DeliveryType;
  startTime?: string;
  cost?: string;
  primaryCost?: string;
  requestStatus: RequestStatus;
  deliveryStatus: DeliveryStatus;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  costOffers?: CostOffer[];
  activityHistory?: ActivityHistory[];
  selectedCompany?: {
    name: string;
    rate: string;
    cost: number;
  };
  // Company assignment fields
  assignedCompanyId?: string;
  assignedWarehouseId?: string;
  // Source and destination warehouse assignments
  sourceWarehouse?: {
    id: string;
    name: string;
    address: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    assignedAt?: string;
  } | null;
  destinationWarehouse?: {
    id: string;
    name: string;
    address: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    assignedAt?: string;
  } | null;
  // Pickup mode fields
  sourcePickupMode?: "Delegate" | "Self";
  destinationPickupMode?: "Delegate" | "Self";
  // Company rejection tracking
  rejectedByCompanies?: string[];
}

// Request payload for POST/PUT operations
export interface RequestPayload {
  user: string; // User ID
  source: Address;
  destination: Address;
  items: Item[];
  deliveryType: DeliveryType;
  startTime?: string;
  primaryCost?: string;
  requestStatus?: RequestStatus;
  deliveryStatus?: DeliveryStatus;
  comment?: string;
  sourceWarehouse?: any;
  destinationWarehouse?: any;
}

// Request response with fully populated user data (from GET endpoints)
export interface RequestResponse extends Request {
  user: UserDetails; // Always populated with user details in responses
}
