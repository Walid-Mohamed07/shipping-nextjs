import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { AuditLog, Vehicle } from "@/lib/models";

const STATUS_TO_DB: Record<string, string> = {
  Available: "available",
  available: "available",
  "In Use": "In Use",
  "in-use": "In Use",
  in_use: "In Use",
  Maintenance: "maintenance",
  maintenance: "maintenance",
  Retired: "retired",
  retired: "retired",
};

const STATUS_TO_CLIENT: Record<string, string> = {
  available: "Available",
  "In Use": "In Use",
  maintenance: "Maintenance",
  retired: "Retired",
};

function normalizeStatus(status?: string) {
  return status ? STATUS_TO_DB[status] || status : undefined;
}

function serializeVehicle(vehicle: any) {
  const id = vehicle._id?.toString() || vehicle.id;
  return {
    ...vehicle,
    id,
    _id: id,
    licensePlate: vehicle.licensePlate || vehicle.plateNumber,
    plateNumber: vehicle.plateNumber || vehicle.licensePlate,
    location: vehicle.location || vehicle.country,
    country: vehicle.country || vehicle.location,
    status: STATUS_TO_CLIENT[vehicle.status] || vehicle.status,
  };
}

async function logAuditAction(
  userId: string,
  action: string,
  description: string,
  resourceId: string,
  resourceType: string,
  changes: any,
) {
  try {
    await AuditLog.create({
      userId,
      userName: "Admin User",
      action,
      description,
      resourceId,
      resourceType,
      changes,
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

/**
 * @swagger
 * /api/admin/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all vehicles
 *       500:
 *         description: Failed to fetch vehicles
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, plateNumber, capacity]
 *             properties:
 *               type:
 *                 type: string
 *               plateNumber:
 *                 type: string
 *               capacity:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [available, in-use, maintenance]
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       500:
 *         description: Failed to create vehicle
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const vehicles = await Vehicle.find({}).lean();
    return NextResponse.json(
      { vehicles: vehicles.map(serializeVehicle) },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, type, capacity } = body;
    const plateNumber = body.plateNumber || body.licensePlate;
    const country = body.country || body.location || "Egypt";

    if (!name || !type || !plateNumber || !capacity) {
      return NextResponse.json(
        { error: "Name, type, plate number, and capacity are required" },
        { status: 400 },
      );
    }

    const newVehicle = await Vehicle.create({
      name,
      type,
      plateNumber,
      capacity,
      status: normalizeStatus(body.status) || "available",
      country,
    });

    await logAuditAction(
      "admin-001",
      "VEHICLE_CREATED",
      `Created vehicle ${name}`,
      newVehicle._id.toString(),
      "Vehicle",
      {
        name,
        type,
        capacity,
        plateNumber,
        country,
      },
    );

    return NextResponse.json(
      { success: true, vehicle: serializeVehicle(newVehicle.toObject()) },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { vehicleId, name, type, capacity } = body;
    const plateNumber = body.plateNumber || body.licensePlate;
    const country = body.country || body.location;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID required" },
        { status: 400 },
      );
    }

    const oldVehicle = await Vehicle.findById(vehicleId).lean();
    if (!oldVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updateData: any = {};
    const changes: any = {};

    if (name && oldVehicle.name !== name) {
      updateData.name = name;
      changes.name = `${oldVehicle.name} -> ${name}`;
    }
    if (type && oldVehicle.type !== type) {
      updateData.type = type;
      changes.type = `${oldVehicle.type} -> ${type}`;
    }
    if (capacity && oldVehicle.capacity !== capacity) {
      updateData.capacity = capacity;
      changes.capacity = `${oldVehicle.capacity} -> ${capacity}`;
    }
    if (plateNumber && oldVehicle.plateNumber !== plateNumber) {
      updateData.plateNumber = plateNumber;
      changes.plateNumber = `${oldVehicle.plateNumber} -> ${plateNumber}`;
    }
    if (country && oldVehicle.country !== country) {
      updateData.country = country;
      changes.country = `${oldVehicle.country} -> ${country}`;
    }
    const normalizedStatus = normalizeStatus(body.status);
    if (normalizedStatus && oldVehicle.status !== normalizedStatus) {
      updateData.status = normalizedStatus;
      changes.status = `${oldVehicle.status} -> ${normalizedStatus}`;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      updateData,
      { new: true },
    ).lean();

    await logAuditAction(
      "admin-001",
      "VEHICLE_UPDATED",
      `Updated vehicle ${oldVehicle.name}`,
      vehicleId,
      "Vehicle",
      changes,
    );

    return NextResponse.json(
      { success: true, vehicle: serializeVehicle(updatedVehicle) },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("id");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID required" },
        { status: 400 },
      );
    }

    const deletedVehicle = await Vehicle.findByIdAndDelete(vehicleId).lean();
    if (!deletedVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    await logAuditAction(
      "admin-001",
      "VEHICLE_DELETED",
      `Deleted vehicle ${deletedVehicle.name}`,
      vehicleId,
      "Vehicle",
      {
        name: deletedVehicle.name,
        type: deletedVehicle.type,
      },
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
