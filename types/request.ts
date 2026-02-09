import { Address } from "./address";

export type RequestStatus =
  | "Accepted"
  | "Pending"
  | "Rejected"
  | "Cancelled"
  | "Action needed";

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

export interface MediaItem {
  url: string;
  existing: boolean;
}

export interface Item {
  id?: string;
  item?: string;
  name?: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
  note?: string;
  media?: MediaItem[];
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
}

export interface ActivityHistory {
  timestamp: string;
  action: string;
  description: string;
  companyName?: string;
  companyRate?: string;
  cost?: number;
}

export interface Request {
  id?: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    nationalOrPassportNumber: string | null;
    birthDate: string;
    idImage: string | null;
    licenseImage: string | null;
    criminalRecord: string | null;
    status: string;
    profilePicture: string | null;
  };
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
}
