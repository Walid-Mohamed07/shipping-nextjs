export type AddressType = "Home" | "Office" | "Other";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  userId: string;
  country: string;
  countryCode: string;
  fullName: string;
  mobile: string;
  street: string;
  building: string;
  city: string;
  district: string;
  governorate: string;
  postalCode: string;
  landmark: string;
  addressType: AddressType;
  deliveryInstructions: string;
  primary?: boolean;
  warehouseId?: string;
  pickupMode?: string;
  coordinates?: Coordinates;
}
