import { Address } from "./address";

export type UserRole = "client" | "driver" | "admin" | "warehouse_manager";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  locations: Address[];
  createdAt: string;
}
