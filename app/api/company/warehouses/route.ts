import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Company, Warehouse } from "@/lib/models";

/**
 * @swagger
 * /api/company/warehouses:
 *   get:
 *     summary: Get warehouses for a company
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of company warehouses
 *       400:
 *         description: Missing companyId
 *       500:
 *         description: Failed to fetch warehouses
 *   post:
 *     summary: Create or update warehouse for company
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, name, location]
 *             properties:
 *               companyId:
 *                 type: string
 *               name:
 *                 type: string
 *               location:
 *                 type: object
 *     responses:
 *       201:
 *         description: Warehouse created/updated successfully
 *       500:
 *         description: Failed to create warehouse
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 },
      );
    }

    // Find company by ID or userId
    const company = await Company.findOne({
      $or: [{ _id: companyId }, { userId: companyId }],
    }).populate("warehouses");

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const warehouses = await Warehouse.find({
      _id: { $in: company.warehouses },
    }).lean();

    return NextResponse.json(
      {
        warehouses,
        warehouseCount: warehouses.length,
      },
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
    const { companyId, name, location, code, capacity } = body;

    if (!companyId || !name) {
      return NextResponse.json(
        { error: "companyId and name are required" },
        { status: 400 },
      );
    }

    // Find company
    const company = await Company.findOne({
      $or: [{ _id: companyId }, { userId: companyId }],
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Create warehouse
    const newWarehouse = await Warehouse.create({
      name,
      code: code || `WH-${Date.now()}`,
      location,
      capacity: capacity || 1000,
      currentStock: 0,
    });

    // Add warehouse to company
    company.warehouses.push(newWarehouse._id);
    await company.save();

    return NextResponse.json(
      {
        success: true,
        warehouse: newWarehouse,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
