import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));

    return NextResponse.json(
      { vehicles: vehiclesData.vehicles },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, capacity, licensePlate, location } = body;

    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));

    const newVehicle = {
      id: `VEH-${Date.now()}`,
      name,
      type,
      capacity,
      licensePlate,
      location,
      status: "Available",
      createdAt: new Date().toISOString(),
    };

    vehiclesData.vehicles.push(newVehicle);
    fs.writeFileSync(vehiclesPath, JSON.stringify(vehiclesData, null, 2));

    // Log the action
    logAuditAction(
      "admin-001",
      "VEHICLE_CREATED",
      `Created vehicle ${name}`,
      newVehicle.id,
      "Vehicle",
      {
        name,
        type,
        capacity,
        licensePlate,
        location,
      },
    );

    return NextResponse.json(
      { success: true, vehicle: newVehicle },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicleId, name, type, capacity, licensePlate, location, status } =
      body;

    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));

    const vehicleIndex = vehiclesData.vehicles.findIndex(
      (v: any) => v.id === vehicleId,
    );
    if (vehicleIndex === -1) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const oldVehicle = vehiclesData.vehicles[vehicleIndex];
    const changes: any = {};

    if (name && oldVehicle.name !== name) {
      vehiclesData.vehicles[vehicleIndex].name = name;
      changes.name = `${oldVehicle.name} -> ${name}`;
    }
    if (type && oldVehicle.type !== type) {
      vehiclesData.vehicles[vehicleIndex].type = type;
      changes.type = `${oldVehicle.type} -> ${type}`;
    }
    if (capacity && oldVehicle.capacity !== capacity) {
      vehiclesData.vehicles[vehicleIndex].capacity = capacity;
      changes.capacity = `${oldVehicle.capacity} -> ${capacity}`;
    }
    if (licensePlate && oldVehicle.licensePlate !== licensePlate) {
      vehiclesData.vehicles[vehicleIndex].licensePlate = licensePlate;
      changes.licensePlate = `${oldVehicle.licensePlate} -> ${licensePlate}`;
    }
    if (location && oldVehicle.location !== location) {
      vehiclesData.vehicles[vehicleIndex].location = location;
      changes.location = `${oldVehicle.location} -> ${location}`;
    }
    if (status && oldVehicle.status !== status) {
      vehiclesData.vehicles[vehicleIndex].status = status;
      changes.status = `${oldVehicle.status} -> ${status}`;
    }

    fs.writeFileSync(vehiclesPath, JSON.stringify(vehiclesData, null, 2));

    // Log the action
    logAuditAction(
      "admin-001",
      "VEHICLE_UPDATED",
      `Updated vehicle ${oldVehicle.name}`,
      vehicleId,
      "Vehicle",
      changes,
    );

    return NextResponse.json(
      { success: true, vehicle: vehiclesData.vehicles[vehicleIndex] },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("id");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID required" },
        { status: 400 },
      );
    }

    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));

    const vehicleIndex = vehiclesData.vehicles.findIndex(
      (v: any) => v.id === vehicleId,
    );
    if (vehicleIndex === -1) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const deletedVehicle = vehiclesData.vehicles[vehicleIndex];
    vehiclesData.vehicles.splice(vehicleIndex, 1);
    fs.writeFileSync(vehiclesPath, JSON.stringify(vehiclesData, null, 2));

    // Log the action
    logAuditAction(
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
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 },
    );
  }
}

function logAuditAction(
  userId: string,
  action: string,
  description: string,
  resourceId: string,
  resourceType: string,
  changes: any,
) {
  try {
    const auditPath = path.join(process.cwd(), "data", "audit-logs.json");
    const auditData = JSON.parse(fs.readFileSync(auditPath, "utf-8"));

    const logEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      userName: "Admin User",
      action,
      description,
      resourceId,
      resourceType,
      changes,
    };

    auditData.logs.push(logEntry);
    fs.writeFileSync(auditPath, JSON.stringify(auditData, null, 2));
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}
