import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Company Profile API
 * 
 * Get company profile information associated with a user ID
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    // Try to find company by userId association
    let company = companiesData.companies.find(
      (c: any) => c.userId === userId
    );

    // If not found by userId, try to match by email from users
    if (!company) {
      const usersPath = path.join(process.cwd(), "data", "users.json");
      const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
      const user = usersData.users.find((u: any) => u.id === userId);
      
      if (user) {
        company = companiesData.companies.find(
          (c: any) => c.email === user.email
        );
      }
    }

    if (!company) {
      // Return a default company profile based on user info
      const usersPath = path.join(process.cwd(), "data", "users.json");
      const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
      const user = usersData.users.find((u: any) => u.id === userId);

      if (user) {
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
