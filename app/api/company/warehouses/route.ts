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
        { status: 400 }
      );
    }

    // Find company by ID or userId
    const company = await Company.findOne({
      $or: [{ _id: companyId }, { userId: companyId }]
    }).populate("warehouses");

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const warehouses = await Warehouse.find({
      _id: { $in: company.warehouses }
    }).lean();

    return NextResponse.json(
      {
        warehouses,
        warehouseCount: warehouses.length,
      },
      { status: 200 }
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
        { status: 400 }
      );
    }

    // Find company
    const company = await Company.findOne({
      $or: [{ _id: companyId }, { userId: companyId }]
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
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
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}    if (!company) {
      return NextResponse.json(
        { warehouses: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { warehouses: company.warehouses || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching company warehouses:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

// POST - Create a new warehouse for a company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, address, coordinates, city, country } = body;

    if (!companyId || !name || !address) {
      return NextResponse.json(
        { error: "companyId, name, and address are required" },
        { status: 400 }
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    // Find company by ID or userId
    let companyIndex = companiesData.companies.findIndex(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    const now = new Date().toISOString();

    // If company doesn't exist, create it
    if (companyIndex === -1) {
      const newCompany = {
        id: `company-${Date.now()}`,
        userId: companyId,
        name: "Company",
        phoneNumber: "",
        email: "",
        address: "",
        rate: "N/A",
        warehouses: [],
        createdAt: now,
        updatedAt: now,
      };
      companiesData.companies.push(newCompany);
      companyIndex = companiesData.companies.length - 1;
    }

    const company = companiesData.companies[companyIndex];

    // Initialize warehouses array if not exists
    if (!company.warehouses) {
      company.warehouses = [];
    }

    // Create new warehouse
    const newWarehouse = {
      id: `wh-company-${Date.now()}`,
      name,
      address,
      city: city || "",
      country: country || "",
      coordinates: coordinates || null,
      createdAt: now,
      updatedAt: now,
    };

    company.warehouses.push(newWarehouse);
    company.updatedAt = now;

    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));

    return NextResponse.json(
      { success: true, warehouse: newWarehouse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 }
    );
  }
}

// PUT - Update a warehouse
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, warehouseId, name, address, coordinates, city, country } = body;

    if (!companyId || !warehouseId) {
      return NextResponse.json(
        { error: "companyId and warehouseId are required" },
        { status: 400 }
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    // Find company
    const companyIndex = companiesData.companies.findIndex(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    if (companyIndex === -1) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const company = companiesData.companies[companyIndex];

    if (!company.warehouses) {
      return NextResponse.json(
        { error: "No warehouses found" },
        { status: 404 }
      );
    }

    // Find warehouse
    const warehouseIndex = company.warehouses.findIndex(
      (w: any) => w.id === warehouseId
    );

    if (warehouseIndex === -1) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update warehouse
    company.warehouses[warehouseIndex] = {
      ...company.warehouses[warehouseIndex],
      name: name || company.warehouses[warehouseIndex].name,
      address: address || company.warehouses[warehouseIndex].address,
      city: city !== undefined ? city : company.warehouses[warehouseIndex].city,
      country: country !== undefined ? country : company.warehouses[warehouseIndex].country,
      coordinates: coordinates !== undefined ? coordinates : company.warehouses[warehouseIndex].coordinates,
      updatedAt: now,
    };

    company.updatedAt = now;
    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));

    return NextResponse.json(
      { success: true, warehouse: company.warehouses[warehouseIndex] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a warehouse
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");
    const warehouseId = searchParams.get("warehouseId");

    if (!companyId || !warehouseId) {
      return NextResponse.json(
        { error: "companyId and warehouseId are required" },
        { status: 400 }
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    // Find company
    const companyIndex = companiesData.companies.findIndex(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    if (companyIndex === -1) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const company = companiesData.companies[companyIndex];

    if (!company.warehouses) {
      return NextResponse.json(
        { error: "No warehouses found" },
        { status: 404 }
      );
    }

    // Filter out the warehouse to delete
    const originalLength = company.warehouses.length;
    company.warehouses = company.warehouses.filter(
      (w: any) => w.id !== warehouseId
    );

    if (company.warehouses.length === originalLength) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    company.updatedAt = new Date().toISOString();
    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));

    return NextResponse.json(
      { success: true, message: "Warehouse deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 }
    );
  }
}
