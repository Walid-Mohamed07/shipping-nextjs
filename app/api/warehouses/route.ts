import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/** Public read-only endpoint for fetching warehouse locations (for nearby search) */
export async function GET() {
  try {
    const warehousesPath = path.join(process.cwd(), "data", "warehouse.json");
    const warehousesData = JSON.parse(
      fs.readFileSync(warehousesPath, "utf-8")
    );

    const warehouses = Array.isArray(warehousesData)
      ? warehousesData
      : warehousesData.warehouses || [];

    return NextResponse.json({ warehouses }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch warehouses", warehouses: [] },
      { status: 500 }
    );
  }
}
