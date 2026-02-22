import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Warehouse } from "@/lib/models";

/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Get all warehouses
 *     description: Fetch list of available warehouses for nearby search
 *     tags:
 *       - Warehouses
 *     responses:
 *       200:
 *         description: Successfully retrieved warehouses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 warehouses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Warehouse'
 *       500:
 *         description: Failed to fetch warehouses
 */
export async function GET() {
  try {
    await connectDB();
    const warehouses = await Warehouse.find();

    return NextResponse.json({ warehouses }, { status: 200 });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses", warehouses: [] },
      { status: 500 },
    );
  }
}
