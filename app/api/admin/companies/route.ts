import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Company } from "@/lib/models";

/**
 * @swagger
 * /api/admin/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all companies
 *       500:
 *         description: Failed to fetch companies
 *   post:
 *     summary: Create a new company
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phoneNumber]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to create company
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const companies = await Company.find({}).populate("warehouses").lean();

    return NextResponse.json(companies, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, phoneNumber, email, rating } = body;

    if (!name || !phoneNumber || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const newCompany = new Company({
      name,
      phoneNumber,
      email,
      rating: rating || 0,
    });

    await newCompany.save();

    return NextResponse.json(
      {
        success: true,
        company: newCompany,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, name, phoneNumber, email, rating } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (email) updateData.email = email;
    if (rating !== undefined) updateData.rating = rating;

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: "after" },
    );

    if (!updatedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        company: updatedCompany,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating company:", error);
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    const deletedCompany = await Company.findByIdAndDelete(id);

    if (!deletedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting company:", error);
    return handleError(error);
  }
}
