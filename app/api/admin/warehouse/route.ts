import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "warehouse.json");

function readWarehouses() {
  const data = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(data);
}

function writeWarehouses(data: any) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  const warehouses = readWarehouses();
  return NextResponse.json(warehouses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const warehouses = readWarehouses();
  const newWarehouse = {
    ...body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    stockType: body.stockType || "all",
  };
  warehouses.push(newWarehouse);
  writeWarehouses(warehouses);
  return NextResponse.json(newWarehouse, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const warehouses = readWarehouses();
  const idx = warehouses.findIndex((w: any) => w.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
  }
  warehouses[idx] = { ...warehouses[idx], ...body };
  writeWarehouses(warehouses);
  return NextResponse.json(warehouses[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  let warehouses = readWarehouses();
  const idx = warehouses.findIndex((w: any) => w.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
  }
  const deleted = warehouses[idx];
  warehouses = warehouses.filter((w: any) => w.id !== id);
  writeWarehouses(warehouses);
  return NextResponse.json(deleted);
}
