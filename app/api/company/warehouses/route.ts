import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB, handleError } from "@/lib/db";
import { Company, User, Warehouse } from "@/lib/models";

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
 *             required: [companyId, name, country]
 *             properties:
 *               companyId:
 *                 type: string
 *               name:
 *                 type: string
 *               country:
 *                 type: string
 *               state:
 *                 type: string
 *               location:
 *                 type: string
 *               code:
 *                 type: string
 *               capacity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Warehouse created/updated successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to create warehouse
 *   delete:
 *     summary: Delete a warehouse
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Warehouse deleted successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Company or warehouse not found
 *       500:
 *         description: Failed to delete warehouse
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

    // Resolve company: first try via user.company, then by direct Company _id
    let company = null;
    const user = await User.findById(companyId).populate("company").catch(() => null);
    if (user?.company) {
      company = user.company;
    } else {
      const isObjectId = /^[a-f\d]{24}$/i.test(companyId);
      if (isObjectId) {
        company = await Company.findOne({ $or: [{ _id: companyId }, { userId: companyId }] });
      } else {
        company = await Company.findOne({ userId: companyId });
      }
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const warehouses = await Warehouse.find({
      _id: { $in: company.warehouses },
    }).lean();

    // Convert _id to id for consistency with frontend expectations
    const normalizedWarehouses = warehouses.map((wh: any) => ({
      ...wh,
      id: wh._id.toString(),
    }));

    return NextResponse.json(
      {
        warehouses: normalizedWarehouses,
        warehouseCount: normalizedWarehouses.length,
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
    const { companyId, name, location, code, capacity, country, state, latitude, longitude } = body;

    if (!companyId || !name || !country) {
      return NextResponse.json(
        { error: "companyId, name, and country are required" },
        { status: 400 },
      );
    }

    // Resolve company: first try via user.company, then by direct Company _id
    let company = null;
    const user = await User.findById(companyId).populate("company").catch(() => null);
    if (user?.company) {
      company = user.company;
    } else {
      const isObjectId = /^[a-f\d]{24}$/i.test(companyId);
      if (isObjectId) {
        company = await Company.findOne({ $or: [{ _id: companyId }, { userId: companyId }] });
      } else {
        company = await Company.findOne({ userId: companyId });
      }
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Create warehouse
    const newWarehouse = await Warehouse.create({
      name,
      code: code || `WH-${Date.now()}`,
      location,
      country,
      state,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      capacity: capacity || 1000,
      currentStock: 0,
    });

    // Add warehouse to company
    company.warehouses.push(newWarehouse._id);
    await company.save();

    // Convert _id to id for consistency with frontend expectations
    const normalizedWarehouse = {
      ...newWarehouse.toObject(),
      id: newWarehouse._id.toString(),
    };

    return NextResponse.json(
      {
        success: true,
        warehouse: normalizedWarehouse,
      },
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
    const { companyId, warehouseId, name, location, code, capacity, country, state, latitude, longitude } = body;

    if (!companyId || !warehouseId || !name || !country) {
      return NextResponse.json(
        { error: "companyId, warehouseId, name, and country are required" },
        { status: 400 },
      );
    }

    // Resolve company: first try via user.company, then by direct Company _id
    let company = null;
    const user = await User.findById(companyId).populate("company").catch(() => null);
    if (user?.company) {
      company = user.company;
    } else {
      const isObjectId = /^[a-f\d]{24}$/i.test(companyId);
      if (isObjectId) {
        company = await Company.findOne({ $or: [{ _id: companyId }, { userId: companyId }] });
      } else {
        company = await Company.findOne({ userId: companyId });
      }
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if warehouse belongs to this company
    const warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);
    const warehouseExists = company.warehouses.some(
      (wh: any) => wh.equals(warehouseObjectId),
    );

    if (!warehouseExists) {
      return NextResponse.json(
        { error: "Warehouse not found in company" },
        { status: 404 },
      );
    }

    // Update warehouse
    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      {
        name,
        code: code || `WH-${Date.now()}`,
        location,
        country,
        state,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        capacity: capacity || 1000,
      },
      { new: true },
    );

    // Convert _id to id for consistency with frontend expectations
    const normalizedWarehouse = updatedWarehouse
      ? {
          ...updatedWarehouse.toObject(),
          id: updatedWarehouse._id.toString(),
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        warehouse: normalizedWarehouse,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");
    const warehouseId = searchParams.get("warehouseId");

    if (!companyId || !warehouseId) {
      return NextResponse.json(
        { error: "companyId and warehouseId are required" },
        { status: 400 },
      );
    }

    // Resolve company: first try via user.company, then by direct Company _id
    let company = null;
    const user = await User.findById(companyId).populate("company").catch(() => null);
    if (user?.company) {
      company = user.company;
    } else {
      const isObjectId = /^[a-f\d]{24}$/i.test(companyId);
      if (isObjectId) {
        company = await Company.findOne({ $or: [{ _id: companyId }, { userId: companyId }] });
      } else {
        company = await Company.findOne({ userId: companyId });
      }
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if warehouse belongs to this company
    const warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);
    const warehouseIndex = company.warehouses.findIndex(
      (wh: any) => wh.equals(warehouseObjectId),
    );

    if (warehouseIndex === -1) {
      return NextResponse.json(
        { error: "Warehouse not found in company" },
        { status: 404 },
      );
    }

    // Remove warehouse from company
    company.warehouses.splice(warehouseIndex, 1);
    await company.save();

    // Delete warehouse document
    await Warehouse.findByIdAndDelete(warehouseId);

    return NextResponse.json(
      {
        success: true,
        message: "Warehouse deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
