import { Address } from "./address";

export type OrderStatus = "Accepted" | "Pending" | "Rejected" | "Cancelled";
export type DeliveryStatus = "Pending" | "In Transit" | "Delivered" | "Failed";
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
