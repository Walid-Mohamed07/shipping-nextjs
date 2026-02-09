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
  PICKED_UP_DESTINATION = "Picked Up Destination",
  DELIVERED = "Delivered",
  FAILED = "Failed",
}

export type DeliveryStatus = RequestDeliveryStatus;
export type PickupMode = "Delegate" | "Self";
export type DeliveryType = "Normal" | "Urgent";

export interface Item {
  id: string;
  name: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
  note?: string;
  media: string[];
}

export interface ShippingItem {
  item: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
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
  primaryCost?: string;
  estimatedTime?: string;
  requestStatus: RequestStatus;
  deliveryStatus: DeliveryStatus;
  createdAt?: string;
  updatedAt?: string;
}
