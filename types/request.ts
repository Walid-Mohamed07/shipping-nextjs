import { Address } from "./address";

export type OrderStatus = "Accepted" | "Pending" | "Rejected" | "Cancelled";

export enum RequestDeliveryStatus {
  PENDING = 'Pending',
  PICKED_UP_SOURCE = 'Picked Up Source',
  WAREHOUSE_SOURCE_RECEIVED = 'Warehouse Source Received',
  IN_TRANSIT = 'In Transit',
  WAREHOUSE_DESTINATION_RECEIVED = 'Warehouse Destination Received',
  PICKED_UP_DESTINATION = 'Picked Up Destination',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
}

export type DeliveryStatus = RequestDeliveryStatus | "Pending" | "In Transit" | "Delivered" | "Failed";
export type PickupMode = "Delegate" | "Direct" | "Scheduled";


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
  source: Address;
  destination: Address;
  items: ShippingItem[];
  estimatedCost: string;
  estimatedTime: string;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  createdAt?: string;
  updatedAt?: string;
}
