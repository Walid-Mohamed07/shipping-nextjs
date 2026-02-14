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
    const { name, phoneNumber, email, rating, userId } = body;

    if (!name || !phoneNumber || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const newCompany = {
      id: `company-${Date.now()}`,
      name,
      phoneNumber,
      email,
      address,
      rate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    companiesData.companies.push(newCompany);
    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));

    return NextResponse.json(
      {
        success: true,
        company: newCompany,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phoneNumber, email, address, rate } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const companyIndex = companiesData.companies.findIndex(
      (c: any) => c.id === id,
    );
    if (companyIndex === -1) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updatedCompany = {
      ...companiesData.companies[companyIndex],
      name: name || companiesData.companies[companyIndex].name,
      phoneNumber:
        phoneNumber || companiesData.companies[companyIndex].phoneNumber,
      email: email || companiesData.companies[companyIndex].email,
      address: address || companiesData.companies[companyIndex].address,
      rate: rate || companiesData.companies[companyIndex].rate,
      updatedAt: new Date().toISOString(),
    };

    companiesData.companies[companyIndex] = updatedCompany;
    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));

    return NextResponse.json(
      {
        success: true,
        company: updatedCompany,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const companyIndex = companiesData.companies.findIndex(
      (c: any) => c.id === id,
    );
    if (companyIndex === -1) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    companiesData.companies.splice(companyIndex, 1);
    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 },
    );
  }
}
