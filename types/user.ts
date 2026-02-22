import { Address } from "./address";

export type UserRole =
  | "client"
  | "driver"
  | "admin"
  | "warehouse_manager"
  | "operator"
  | "company";

export interface User {
  _id?: string;
  id?: string;
  fullName: string;
  username: string;
  name: string;
  email: string;
  password: string;
  profilePicture: string | null;
  mobile?: string | null;
  nationalOrPassportNumber: string | null;
  birthDate: string | null;
  idImage: string | null;
  licenseImage: string | null;
  criminalRecord: string | null;
  status: "active" | "inactive" | "suspended";
  role: UserRole;
  locations?: Address[];
  company?: string | { _id: string; name: string; email: string; phoneNumber: string; address?: string; rate?: string } | null;
  createdAt: string;
  updatedAt?: string;
}
