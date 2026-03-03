import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Company } from "@/lib/models";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/lib/fileUpload";

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
    const formData = await request.formData();
    
    const name = formData.get("name") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const rate = formData.get("rate") as string;
    const address = formData.get("address") as string;
    const category = formData.get("category") as string;
    const logoFile = formData.get("logo") as File | null;

    if (!name || !phoneNumber || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let logoPath: string | undefined;
    if (logoFile && logoFile.size > 0) {
      logoPath = await uploadCompanyLogo(logoFile);
    }

    const newCompany = new Company({
      name,
      phoneNumber,
      email,
      rate: parseFloat(rate) || 0,
      address: address || "",
      category: category || "",
      logo: logoPath,
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
    const formData = await request.formData();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const rate = formData.get("rate") as string;
    const address = formData.get("address") as string;
    const category = formData.get("category") as string;
    const logoFile = formData.get("logo") as File | null;
    const existingLogo = formData.get("existingLogo") as string | null;

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
    if (rate !== undefined) updateData.rate = parseFloat(rate);
    if (address !== undefined) updateData.address = address;
    if (category !== undefined) updateData.category = category;

    // Handle logo upload/update
    if (logoFile && logoFile.size > 0) {
      // Delete old logo if exists
      if (existingLogo) {
        await deleteCompanyLogo(existingLogo);
      }
      // Upload new logo
      updateData.logo = await uploadCompanyLogo(logoFile);
    }

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

    // Delete associated logo file
    if (deletedCompany.logo) {
      await deleteCompanyLogo(deletedCompany.logo);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting company:", error);
    return handleError(error);
  }
}
