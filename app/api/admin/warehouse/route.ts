import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Warehouse } from "@/lib/models";

/**
 * @swagger
 * /api/admin/warehouse:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all warehouses
 *       500:
 *         description: Failed to fetch warehouses
 *   put:
 *     summary: Update a warehouse
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [warehouseId]
 *             properties:
 *               warehouseId:
 *                 type: string
 *               name:
 *                 type: string
 *               capacity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 *       500:
 *         description: Failed to update warehouse
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const warehouses = await Warehouse.find({}).lean();
    return NextResponse.json({ warehouses }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { warehouseId, ...updateData } = body;

    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      { ...updateData, updatedAt: new Date() },
      { returnDocument: "after" },
    );

    if (!updatedWarehouse) {
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
