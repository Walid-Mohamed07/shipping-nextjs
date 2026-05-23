import { Address } from "./address";
import { User } from "./user";

export type RequestStatus =
  | "Accepted"
  | "Pending"
  | "Rejected"
  | "Cancelled"
  | "Action needed"
  | "Assigned to Driver"
  | "In Progress"
  | "Completed";

export enum RequestDeliveryStatus {
  PENDING = "Pending",
  PICKED_UP_SOURCE = "Picked Up Source",
  IN_TRANSIT = "In Transit",
  SHIPMENT_DELIVER = "Shipment Deliver",
  DELIVERED = "Delivered",
  FAILED = "Failed",
}

export type DeliveryStatus = RequestDeliveryStatus;
export type PickupMode = "Delegate" | "Self";
export type DeliveryType = "Normal" | "Urgent" | "Scheduled";
export type DayOfWeek =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "All Week";

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
  weight: string;
  quantity: number;
  note?: string;
  media?: MediaItem[];
  mediaFiles?: File[]; // Temporary storage for files before upload
}

export interface ShippingItem {
  item: string;
  category: string;
  weight: string;
  quantity: number;
}

export type FloorNumber =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "10+";

export interface CostOffer {
  _id?: string;
  id?: string;
  cost: number;
  currency?: string; // Currency of the offer (default: USD)
  headoverPercentage?: number; // The headover percentage applied
  headoverAmount?: number; // Computed headover in dollars
  finalPrice?: number; // Cost with headover markup applied
  driver: {
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
  driverName?: string;
  driverRate?: string;
  cost?: number;
  currency?: string;
  details?: Record<string, any>;
}

export interface Request {
  id?: string;
  _id: string;
  publicId?: string; // Public ID in format REQ-XXXXX for external use
  user: string | UserDetails | User; // Can be string ID, populated UserDetails, or full User
  source: Address;
  destination: Address;
  from?: Address;
  to?: Address;
  items: Item[];
  deliveryType: DeliveryType;
  scheduledDate?: string;
  startTime?: string;
  collectionAvailableDays?: DayOfWeek[];
  deliveryAvailableDays?: DayOfWeek[];
  cost?: string;
  // primaryCost?: string; // TEMPORARILY HIDDEN - primaryCost
  requestStatus: RequestStatus;
  deliveryStatus: DeliveryStatus;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  costOffers?: CostOffer[];
  activityHistory?: ActivityHistory[];
  selectedDriver?: {
    id?: string;
    name: string;
    rate: string;
    cost: number;
    finalPrice?: number; // Cost with headover markup applied
    headoverPercentage?: number; // The headover percentage applied
    currency?: string; // Currency of the offer
  };
  // Currency pricing - locked when offer is accepted
  pricing?: {
    basePrice: number;
    baseCurrency: string;
    clientCurrency: string;
    exchangeRateAtAcceptance: number;
    lockedPrice: number;
    lockedAt?: string;
    finalLockedPrice?: number;
  };
  // Driver assignment fields
  assignedDriverId?: string;
  // Pickup mode fields
  sourcePickupMode?: "Delegate" | "Self";
  destinationPickupMode?: "Delegate" | "Self";
  // Floor number and winch fields
  receiptFloorNumber?: string;
  needsWinchPickup?: boolean;
  deliveryFloorNumber?: string;
  needsWinchDropoff?: boolean;
  // Driver rejection tracking
  rejectedByDrivers?: string[];
  // Workers
  workersCount?: number; // 0 to 6
  // Transport vehicle type
  transportVehicle?: {
    id: string;
    nameEn: string;
    nameAr: string;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    maxWeight: number;
  };
  // Payment fields
  paymentStatus?:
    | "unpaid"
    | "pending"
    | "paid"
    | "refunded"
    | "failed"
    | "ABANDONED";
  paymentId?: string;
  paidAmount?: number;
  paidAt?: string;
}

// Request payload for POST/PUT operations
export interface RequestPayload {
  user: string; // User ID
  source: Address;
  destination: Address;
  items: Item[];
  deliveryType: DeliveryType;
  scheduledDate?: string;
  startTime?: string;
  collectionAvailableDays?: DayOfWeek[];
  deliveryAvailableDays?: DayOfWeek[];
  // primaryCost?: string; // TEMPORARILY HIDDEN - primaryCost
  requestStatus?: RequestStatus;
  deliveryStatus?: DeliveryStatus;
  comment?: string;
}

// Request response with fully populated user data (from GET endpoints)
export interface RequestResponse extends Request {
  user: UserDetails; // Always populated with user details in responses
}
