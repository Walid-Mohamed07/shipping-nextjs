export type AddressType = "Home" | "Office" | "Other";

export interface Address {
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
  primary: boolean;
}
