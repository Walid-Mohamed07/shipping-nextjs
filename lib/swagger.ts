import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ShipHub API",
      version: "1.0.0",
      description: "API documentation for ShipHub shipping management system",
      contact: {
        name: "ShipHub Support",
        email: "support@shiphub.com",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Address: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            country: { type: "string" },
            countryCode: { type: "string" },
            fullName: { type: "string" },
            mobile: { type: "string" },
            street: { type: "string" },
            building: { type: "string" },
            city: { type: "string" },
            district: { type: "string" },
            governorate: { type: "string" },
            postalCode: { type: "string" },
            landmark: { type: "string" },
            addressType: {
              type: "string",
              enum: ["Home", "Office", "Other"],
            },
            deliveryInstructions: { type: "string" },
            primary: { type: "boolean" },
            warehouseId: { type: "string" },
            pickupMode: { type: "string" },
            coordinates: {
              type: "object",
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" },
              },
            },
          },
        },
        MediaItem: {
          type: "object",
          properties: {
            url: { type: "string" },
            existing: { type: "boolean" },
          },
        },
        ItemServices: {
          type: "object",
          properties: {
            canBeAssembledDisassembled: { type: "boolean" },
            assemblyDisassemblyHandler: {
              type: "string",
              enum: ["self", "company"],
            },
            packaging: { type: "boolean" },
            assemblyDisassembly: { type: "boolean" },
          },
        },
        Item: {
          type: "object",
          required: ["category", "dimensions", "weight", "quantity"],
          properties: {
            item: { type: "string" },
            name: { type: "string" },
            category: { type: "string" },
            dimensions: { type: "string" },
            weight: { type: "string" },
            quantity: { type: "number" },
            note: { type: "string" },
            media: {
              type: "array",
              items: { $ref: "#/components/schemas/MediaItem" },
            },
            services: { $ref: "#/components/schemas/ItemServices" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            email: { type: "string", format: "email" },
            fullName: { type: "string" },
            name: { type: "string" },
            username: { type: "string" },
            profilePicture: { type: "string" },
            mobile: { type: "string" },
            nationalOrPassportNumber: { type: "string" },
            birthDate: { type: "string" },
            idImage: { type: "string" },
            licenseImage: { type: "string" },
            criminalRecord: { type: "string" },
            role: {
              type: "string",
              enum: [
                "client",
                "admin",
                "driver",
                "operator",
                "company",
                "warehouse_manager",
              ],
            },
            status: {
              type: "string",
              enum: ["active", "inactive", "suspended"],
            },
            locations: {
              type: "array",
              items: { $ref: "#/components/schemas/Address" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CostOffer: {
          type: "object",
          properties: {
            cost: { type: "number" },
            company: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                phoneNumber: { type: "string" },
                email: { type: "string" },
                address: { type: "string" },
                rate: { type: "string" },
              },
            },
            comment: { type: "string" },
            selected: { type: "boolean" },
            status: {
              type: "string",
              enum: ["pending", "accepted", "rejected"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ActivityHistory: {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" },
            action: { type: "string" },
            description: { type: "string" },
            companyName: { type: "string" },
            companyRate: { type: "string" },
            cost: { type: "number" },
            details: { type: "string" },
          },
        },
        Warehouse: {
          type: "object",
          properties: {
            _id: { type: "string" },
            id: { type: "string" },
            name: { type: "string" },
            code: { type: "string" },
            country: { type: "string" },
            state: { type: "string" },
            location: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            capacity: { type: "number" },
            currentStock: { type: "number" },
            manager: { type: "string" },
            contact: { type: "string" },
            status: { type: "string" },
            stockType: { type: "string" },
          },
        },
        Vehicle: {
          type: "object",
          properties: {
            _id: { type: "string" },
            id: { type: "string" },
            name: { type: "string" },
            type: {
              type: "string",
              enum: ["Truck", "Van", "Pickup", "Box Truck", "Cargo Van"],
            },
            model: { type: "string" },
            capacity: { type: "string" },
            plateNumber: { type: "string" },
            status: {
              type: "string",
              enum: ["available", "In Use", "maintenance", "retired"],
            },
            country: { type: "string" },
          },
        },
        Request: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
            source: { $ref: "#/components/schemas/Address" },
            destination: { $ref: "#/components/schemas/Address" },
            from: { $ref: "#/components/schemas/Address" },
            to: { $ref: "#/components/schemas/Address" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/Item" },
            },
            estimatedCost: { type: "string" },
            primaryCost: { type: "string" },
            cost: { type: "string" },
            startTime: { type: "string", format: "date-time" },
            requestStatus: {
              type: "string",
              enum: [
                "Pending",
                "Accepted",
                "Rejected",
                "Assigned to Company",
                "In Progress",
                "Completed",
                "Cancelled",
                "Action needed",
              ],
            },
            deliveryStatus: {
              type: "string",
              enum: [
                "Pending",
                "Picked Up Source",
                "Warehouse Source Received",
                "In Transit",
                "Warehouse Destination Received",
                "Shipment Deliver",
                "Delivered",
                "Failed",
              ],
            },
            deliveryType: { type: "string" },
            comment: { type: "string" },
            costOffers: {
              type: "array",
              items: { $ref: "#/components/schemas/CostOffer" },
            },
            activityHistory: {
              type: "array",
              items: { $ref: "#/components/schemas/ActivityHistory" },
            },
            assignedCompanyId: { type: "string" },
            selectedCompany: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                rate: { type: "string" },
                cost: { type: "number" },
              },
            },
            sourceWarehouse: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                country: { type: "string" },
                coordinates: {
                  type: "object",
                  properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
                assignedAt: { type: "string", format: "date-time" },
              },
            },
            destinationWarehouse: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                country: { type: "string" },
                coordinates: {
                  type: "object",
                  properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
                assignedAt: { type: "string", format: "date-time" },
              },
            },
            sourcePickupMode: {
              type: "string",
              enum: ["Delegate", "Self"],
            },
            destinationPickupMode: {
              type: "string",
              enum: ["Delegate", "Self"],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  apis: ["app/api/**/*.ts"],
};

export const specs = swaggerJsdoc(options);
