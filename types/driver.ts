export interface Driver {
  _id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  rate: number;
  category?: string;
  logo?: string; // Base64 encoded image or image URL
  createdAt?: string;
  updatedAt?: string;
  // Associated user ID (for driver role users)
  userId?: string;
}
