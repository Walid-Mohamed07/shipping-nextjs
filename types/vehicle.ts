export type VehicleType = "Pickup" | "Van" | "Truck" | "Bike" | "Car";
export type VehicleStatus = "available" | "in_use" | "maintenance" | "inactive";

export interface Vehicle {
  id: string;
  type: VehicleType;
  model: string;
  name: string;
  plateNumber: string;
  capacity: string;
  country: string;
  status: VehicleStatus;
}
