import { Address } from "./address";

export type UserRole = "client" | "driver" | "admin" | "operator" | "driver";

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
  country?: string; // User's country
  preferredCurrency?: string; // User's preferred currency for display
  driver?:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        phoneNumber: string;
        address?: string;
        rate?: string;
      }
    | null;
  // OTP Verification fields
  emailVerified?: boolean;
  mobileVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}
