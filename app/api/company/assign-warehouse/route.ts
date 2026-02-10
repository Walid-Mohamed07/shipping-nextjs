import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Warehouse Assignment API
 * 
 * When:
 * - Client chooses Pickup Option = Self
 * - Client accepts a company's offer
 * 
 * Then:
 * - The company must assign ONE of its warehouses to the request
 * - The selected warehouse becomes the official pickup location for the client
 * - Warehouse assignment happens after offer acceptance, not before
 * 
 * Rules:
 * - A company can only assign its own warehouses
 * - Once assigned, the warehouse cannot be changed
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, companyId, warehouseId } = body;

    if (!requestId || !companyId || !warehouseId) {
      return NextResponse.json(
        { error: "requestId, companyId, and warehouseId are required" },
        { status: 400 }
      );
    }

    // Validate that the warehouse belongs to the company
    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const company = companiesData.companies.find(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const warehouse = company.warehouses?.find(
      (w: any) => w.id === warehouseId
    );

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found or does not belong to this company" },
        { status: 400 }
      );
    }

    // Load requests
    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const requestIndex = requestsData.requests.findIndex(
      (r: any) => r.id === requestId
    );

    if (requestIndex === -1) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const currentRequest = requestsData.requests[requestIndex];
    const now = new Date().toISOString();

    // Verify the request is assigned to this company
    if (currentRequest.assignedCompanyId !== companyId && 
        currentRequest.assignedCompanyId !== company.id) {
      return NextResponse.json(
        { error: "This request is not assigned to your company" },
        { status: 403 }
      );
    }

    // Verify a warehouse hasn't already been assigned
    if (currentRequest.assignedWarehouseId) {
      return NextResponse.json(
        { error: "A warehouse has already been assigned to this request" },
        { status: 400 }
      );
    }

    // Check if self-pickup is required
    const sourceIsSelfPickup = 
      currentRequest.sourcePickupMode === "Self" || 
      currentRequest.source?.pickupMode === "Self";

    if (!sourceIsSelfPickup) {
      return NextResponse.json(
        { error: "Warehouse assignment is only required for self-pickup requests" },
        { status: 400 }
      );
    }

    // Assign the warehouse
    currentRequest.assignedWarehouseId = warehouseId;
    currentRequest.assignedWarehouse = {
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city || "",
      country: warehouse.country || "",
      coordinates: warehouse.coordinates || null,
    };

    // Update the source pickup location to reflect the warehouse
    currentRequest.pickupWarehouse = {
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city || "",
      country: warehouse.country || "",
      coordinates: warehouse.coordinates || null,
      assignedAt: now,
    };

    // Add to activity history
    if (!currentRequest.activityHistory) {
      currentRequest.activityHistory = [];
    }
    currentRequest.activityHistory.push({
      timestamp: now,
      action: "warehouse_assigned",
      description: `Warehouse "${warehouse.name}" assigned as pickup location`,
    });

    currentRequest.updatedAt = now;

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json({
      success: true,
      message: "Warehouse assigned successfully",
      warehouse: currentRequest.assignedWarehouse,
    }, { status: 200 });
  } catch (error) {
    console.error("Error assigning warehouse:", error);
    return NextResponse.json(
      { error: "Failed to assign warehouse" },
      { status: 500 }
    );
  }
}

// GET - Check if warehouse assignment is needed and get options
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get("requestId");
    const companyId = searchParams.get("companyId");

    if (!requestId || !companyId) {
      return NextResponse.json(
        { error: "requestId and companyId are required" },
        { status: 400 }
      );
    }

    // Load request
    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const currentRequest = requestsData.requests.find(
      (r: any) => r.id === requestId
    );

    if (!currentRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Check if self-pickup is required
    const sourceIsSelfPickup = 
      currentRequest.sourcePickupMode === "Self" || 
      currentRequest.source?.pickupMode === "Self";

    if (!sourceIsSelfPickup) {
      return NextResponse.json({
        needsAssignment: false,
        message: "Warehouse assignment not required for this request",
      }, { status: 200 });
    }

    // Check if already assigned
    if (currentRequest.assignedWarehouseId) {
      return NextResponse.json({
        needsAssignment: false,
        alreadyAssigned: true,
        warehouse: currentRequest.assignedWarehouse,
      }, { status: 200 });
    }

    // Get company warehouses
    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const company = companiesData.companies.find(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    const warehouses = company?.warehouses || [];

    return NextResponse.json({
      needsAssignment: true,
      warehouses,
      message: warehouses.length === 0 
        ? "Please add a warehouse to your company profile first"
        : "Please select a warehouse for client pickup",
    }, { status: 200 });
  } catch (error) {
    console.error("Error checking warehouse assignment:", error);
    return NextResponse.json(
      { error: "Failed to check warehouse assignment" },
      { status: 500 }
    );
  }
}
