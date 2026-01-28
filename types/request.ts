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
  estimatedCost: string;
  estimatedTime: string;
}

export interface Request extends ShippingItem {
  id: string;
  userId: string;
  from: Address;
  to: Address;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  sourceAddress: string;
  sourcePostalCode: string;
  address: string;
  country: string;
  postalCode: string;
  mobile: string;
  warehouseId: string;
  pickupMode: PickupMode;
  createdAt: string;
  updatedAt: string;
}
