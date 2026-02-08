import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    return NextResponse.json(companiesData.companies, { status: 200 });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phoneNumber, email, address, rate } = body;

    if (!name || !phoneNumber || !email || !address || !rate) {
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
