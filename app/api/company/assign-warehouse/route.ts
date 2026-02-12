import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Warehouse Assignment API
 * 
 * When:
 * - Client chooses Pickup Option = Self (for source warehouse)
 * - Client chooses Delivery Option = Self (for destination warehouse)
 * - Client accepts a company's offer
 * 
 * Then:
 * - The company must assign warehouse(s) to the request
 * - Source warehouse: pickup location for the client
 * - Destination warehouse: delivery location for the client
 * 
 * Rules:
 * - A company can only assign its own warehouses
 * - Each type (source/destination) can only be assigned once
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, companyId, warehouseId, warehouseType = "source" } = body;

    if (!requestId || !companyId || !warehouseId) {
      return NextResponse.json(
        { error: "requestId, companyId, and warehouseId are required" },
        { status: 400 }
      );
    }

    if (!["source", "destination"].includes(warehouseType)) {
      return NextResponse.json(
        { error: "warehouseType must be 'source' or 'destination'" },
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

    // Check if the specific warehouse type is already assigned
    const warehouseField = warehouseType === "source" ? "sourceWarehouse" : "destinationWarehouse";
    if (currentRequest[warehouseField]) {
      return NextResponse.json(
        { error: `A ${warehouseType} warehouse has already been assigned to this request` },
        { status: 400 }
      );
    }

    // Check if self-pickup/delivery is required for this warehouse type
    const isSelfMode = warehouseType === "source" 
      ? (currentRequest.sourcePickupMode === "Self" || currentRequest.source?.pickupMode === "Self")
      : (currentRequest.destinationPickupMode === "Self" || currentRequest.destination?.pickupMode === "Self");

    if (!isSelfMode) {
      return NextResponse.json(
        { error: `Warehouse assignment is only required for self-pickup/delivery requests` },
        { status: 400 }
      );
    }

    // Assign the warehouse
    const warehouseData = {
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city || "",
      country: warehouse.country || "",
      coordinates: warehouse.coordinates || null,
      assignedAt: now,
    };

    currentRequest[warehouseField] = warehouseData;

    // Legacy support: also update assignedWarehouseId for source warehouse
    if (warehouseType === "source") {
      currentRequest.assignedWarehouseId = warehouseId;
      currentRequest.assignedWarehouse = warehouseData;
      currentRequest.pickupWarehouse = warehouseData;
    }

    // Add to activity history
    if (!currentRequest.activityHistory) {
      currentRequest.activityHistory = [];
    }
    const locationLabel = warehouseType === "source" ? "pickup" : "delivery";
    currentRequest.activityHistory.push({
      timestamp: now,
      action: "warehouse_assigned",
      description: `Warehouse "${warehouse.name}" assigned as ${locationLabel} location`,
    });

    currentRequest.updatedAt = now;

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json({
      success: true,
      message: `${warehouseType.charAt(0).toUpperCase() + warehouseType.slice(1)} warehouse assigned successfully`,
      warehouse: currentRequest[warehouseField],
      warehouseType,
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
    const warehouseType = searchParams.get("warehouseType") || "both";

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

    // Check if self-pickup/delivery is required
    const sourceIsSelfPickup = 
      currentRequest.sourcePickupMode === "Self" || 
      currentRequest.source?.pickupMode === "Self";
    const destinationIsSelfDelivery = 
      currentRequest.destinationPickupMode === "Self" || 
      currentRequest.destination?.pickupMode === "Self";

    // Build response for both warehouse types
    const sourceStatus = {
      needsAssignment: sourceIsSelfPickup && !currentRequest.sourceWarehouse,
      alreadyAssigned: !!currentRequest.sourceWarehouse,
      warehouse: currentRequest.sourceWarehouse || null,
    };

    const destinationStatus = {
      needsAssignment: destinationIsSelfDelivery && !currentRequest.destinationWarehouse,
      alreadyAssigned: !!currentRequest.destinationWarehouse,
      warehouse: currentRequest.destinationWarehouse || null,
    };

    // Get company warehouses
    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const company = companiesData.companies.find(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    const warehouses = company?.warehouses || [];

    return NextResponse.json({
      sourceWarehouse: sourceStatus,
      destinationWarehouse: destinationStatus,
      needsAnyAssignment: sourceStatus.needsAssignment || destinationStatus.needsAssignment,
      warehouses,
      message: warehouses.length === 0 
        ? "Please add a warehouse to your company profile first"
        : "Select warehouses for client pickup/delivery",
    }, { status: 200 });
  } catch (error) {
    console.error("Error checking warehouse assignment:", error);
    return NextResponse.json(
      { error: "Failed to check warehouse assignment" },
      { status: 500 }
    );
  }
}
