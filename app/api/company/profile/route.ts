import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Company, User } from "@/lib/models";

/**\n * @swagger
 * /api/company/profile:
 *   get:
 *     summary: Get company profile by userId
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company profile details
 *       404:
 *         description: Company not found
 *       500:
 *         description: Failed to fetch profile
 *   put:
 *     summary: Update company profile
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       500:
 *         description: Failed to update profile
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Try to find company by userId association
    let company = await Company.findOne({ userId }).populate("warehouses");

    // If not found by userId, try to match by email
    if (!company) {
      const user = await User.findById(userId);
      if (user) {
        company = await Company.findOne({ email: user.email }).populate("warehouses");
      }
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }
        return NextResponse.json({
          id: userId,
          name: user.fullName || user.name || "Company",
          email: user.email,
          phoneNumber: user.locations?.[0]?.mobile || "",
          address: user.locations?.[0]?.street || "",
          rate: "N/A",
          warehouses: [],
        }, { status: 200 });
      }

      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company, { status: 200 });
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch company profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phoneNumber, email, address, rate } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    let companyIndex = companiesData.companies.findIndex(
      (c: any) => c.userId === userId
    );

    const now = new Date().toISOString();

    if (companyIndex === -1) {
      // Create new company profile
      const newCompany = {
        id: `company-${Date.now()}`,
        userId,
        name: name || "Company",
        phoneNumber: phoneNumber || "",
        email: email || "",
        address: address || "",
        rate: rate || "N/A",
        warehouses: [],
        createdAt: now,
        updatedAt: now,
      };
      companiesData.companies.push(newCompany);
      fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));
      return NextResponse.json(newCompany, { status: 201 });
    }

    // Update existing company
    companiesData.companies[companyIndex] = {
      ...companiesData.companies[companyIndex],
      name: name || companiesData.companies[companyIndex].name,
      phoneNumber: phoneNumber || companiesData.companies[companyIndex].phoneNumber,
      email: email || companiesData.companies[companyIndex].email,
      address: address || companiesData.companies[companyIndex].address,
      rate: rate || companiesData.companies[companyIndex].rate,
      updatedAt: now,
    };

    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2));
    return NextResponse.json(companiesData.companies[companyIndex], { status: 200 });
  } catch (error) {
    console.error("Error updating company profile:", error);
    return NextResponse.json(
      { error: "Failed to update company profile" },
      { status: 500 }
    );
  }
}
