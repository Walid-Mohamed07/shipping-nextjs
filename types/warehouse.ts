export type WarehouseStatus = "active" | "inactive" | "maintenance";
export type StockType =
  | "all"
  | "electronics"
  | "clothing"
  | "perishables"
  | "fragile";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  country: string;
  state: string;
  location: string;
  capacity: number;
  currentStock: number;
  manager: string;
  contact: string;
  status: WarehouseStatus;
  createdAt: string;
  stockType: StockType;
}
