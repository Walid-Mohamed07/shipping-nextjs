export interface CompanyWarehouse {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Company {
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
  // Company warehouses
  warehouses?: CompanyWarehouse[];
  // Associated user ID (for company role users)
  userId?: string;
}
