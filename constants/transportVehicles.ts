export interface TransportVehicleType {
  id: string;
  nameAr: string;
  nameEn: string;
  dimensions: {
    length: number; // meters
    width: number; // meters
    height: number; // meters
  };
  maxWeight: number; // kg
  image: string; // path to image in public/assets/vehicles/
}

export const TRANSPORT_VEHICLES: TransportVehicleType[] = [
  {
    id: "short-side-pickup",
    nameAr: "دبابة بجوانب قصيرة",
    nameEn: "Short-Side Pickup",
    dimensions: { length: 2.5, width: 1.6, height: 0.4 },
    maxWeight: 1000,
    image: "/assets/vehicles/short-side-pickup.svg",
  },
  {
    id: "box-pickup",
    nameAr: "دبابة صندوق",
    nameEn: "Box Pickup",
    dimensions: { length: 2.5, width: 1.6, height: 1.5 },
    maxWeight: 1200,
    image: "/assets/vehicles/box-pickup.svg",
  },
  {
    id: "box-8-wheeler",
    nameAr: "تمناية صندوق",
    nameEn: "8-Wheeler Box Truck",
    dimensions: { length: 4.0, width: 2.0, height: 2.0 },
    maxWeight: 3000,
    image: "/assets/vehicles/box-8-wheeler.svg",
  },
  {
    id: "jumbo-box-4m",
    nameAr: "جامبو صندوق 4 متر",
    nameEn: "Jumbo Box 4m",
    dimensions: { length: 4.0, width: 2.2, height: 2.2 },
    maxWeight: 5000,
    image: "/assets/vehicles/jumbo-box-4m.svg",
  },
  {
    id: "jumbo-box-6m",
    nameAr: "جامبو صندوق 6 متر",
    nameEn: "Jumbo Box 6m",
    dimensions: { length: 6.0, width: 2.4, height: 2.4 },
    maxWeight: 8000,
    image: "/assets/vehicles/jumbo-box-6m.svg",
  },
  {
    id: "jumbo-open-6m",
    nameAr: "جامبو بدون جوانب 6 متر",
    nameEn: "Jumbo Open 6m",
    dimensions: { length: 6.0, width: 2.4, height: 0.5 },
    maxWeight: 8000,
    image: "/assets/vehicles/jumbo-open-6m.svg",
  },
  {
    id: "rescue-winch",
    nameAr: "ونش إنقاذ",
    nameEn: "Rescue Winch",
    dimensions: { length: 5.0, width: 2.3, height: 0.5 },
    maxWeight: 5000,
    image: "/assets/vehicles/rescue-winch.svg",
  },
];

export const getVehicleById = (id: string): TransportVehicleType | undefined =>
  TRANSPORT_VEHICLES.find((v) => v.id === id);

export const MAX_WORKERS = 6;
