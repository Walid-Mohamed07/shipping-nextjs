import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const warehousesPath = path.join(process.cwd(), "data", "warehouse.json");
    const warehousesData = JSON.parse(fs.readFileSync(warehousesPath, "utf-8"));

    // Ensure we always return in the format { warehouses: [...] }
    const warehouses = Array.isArray(warehousesData)
      ? warehousesData
      : warehousesData.warehouses || [];

    return NextResponse.json({ warehouses }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch warehouses", warehouses: [] },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { warehouseId, ...updateData } = body;

    const warehousesPath = path.join(process.cwd(), "data", "warehouse.json");
    let warehousesData = JSON.parse(fs.readFileSync(warehousesPath, "utf-8"));

    // Handle both array and object formats
    const warehouses = Array.isArray(warehousesData)
      ? warehousesData
      : warehousesData.warehouses || [];
    const warehouseIndex = warehouses.findIndex(
      (w: any) => w.id === warehouseId,
    );

    if (warehouseIndex === -1) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    warehouses[warehouseIndex] = {
      ...warehouses[warehouseIndex],
      ...updateData,
    };

    // Save in the same format it was read
    const dataToSave = Array.isArray(warehousesData)
      ? warehouses
      : { warehouses };
    fs.writeFileSync(warehousesPath, JSON.stringify(dataToSave, null, 2));

    return NextResponse.json(
      { success: true, warehouse: warehouses[warehouseIndex] },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const warehousesPath = path.join(process.cwd(), "data", "warehouse.json");
    let warehousesData = JSON.parse(fs.readFileSync(warehousesPath, "utf-8"));

    const newWarehouse = {
      id: `wh-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    };

    // Handle both array and object formats
    const warehouses = Array.isArray(warehousesData)
      ? warehousesData
      : warehousesData.warehouses || [];
    warehouses.push(newWarehouse);

    // Save in the same format it was read
    const dataToSave = Array.isArray(warehousesData)
      ? warehouses
      : { warehouses };
    fs.writeFileSync(warehousesPath, JSON.stringify(dataToSave, null, 2));

    return NextResponse.json(
      { success: true, warehouse: newWarehouse },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { warehouseId } = body;

    const warehousesPath = path.join(process.cwd(), "data", "warehouse.json");
    let warehousesData = JSON.parse(fs.readFileSync(warehousesPath, "utf-8"));

    // Handle both array and object formats
    const warehouses = Array.isArray(warehousesData)
      ? warehousesData
      : warehousesData.warehouses || [];
    const filtered = warehouses.filter((w: any) => w.id !== warehouseId);

    // Save in the same format it was read
    const dataToSave = Array.isArray(warehousesData)
      ? filtered
      : { warehouses: filtered };
    fs.writeFileSync(warehousesPath, JSON.stringify(dataToSave, null, 2));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 },
    );
  }
}
