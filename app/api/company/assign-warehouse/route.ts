import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, Warehouse } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      requestId,
      companyId,
      warehouseId,
      warehouseType = "source",
    } = body;

    if (!requestId || !companyId || !warehouseId) {
      return NextResponse.json(
        { error: "requestId, companyId, and warehouseId are required" },
        { status: 400 },
      );
    }

    if (!["source", "destination"].includes(warehouseType)) {
      return NextResponse.json(
        { error: "warehouseType must be 'source' or 'destination'" },
        { status: 400 },
      );
    }

    // Verify warehouse exists and belongs to company
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    // Update request with warehouse assignment
    const updateField =
      warehouseType === "source" ? "sourceWarehouse" : "destinationWarehouse";
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        [updateField]: warehouseId,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `${warehouseType.charAt(0).toUpperCase() + warehouseType.slice(1)} warehouse assigned successfully`,
        request: updatedRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get("requestId");
    const companyId = searchParams.get("companyId");

    if (!requestId || !companyId) {
      return NextResponse.json(
        { error: "requestId and companyId are required" },
        { status: 400 },
      );
    }

    const shippingRequest = await Request.findById(requestId).lean();
    if (!shippingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const sourceIsSelfPickup =
      shippingRequest.sourcePickupMode === "Self" ||
      shippingRequest.source?.pickupMode === "Self";
    const destinationIsSelfDelivery =
      shippingRequest.destinationPickupMode === "Self" ||
      shippingRequest.destination?.pickupMode === "Self";

    const sourceStatus = {
      needsAssignment: sourceIsSelfPickup && !shippingRequest.sourceWarehouse,
      alreadyAssigned: !!shippingRequest.sourceWarehouse,
      warehouse: shippingRequest.sourceWarehouse || null,
    };

    const destinationStatus = {
      needsAssignment:
        destinationIsSelfDelivery && !shippingRequest.destinationWarehouse,
      alreadyAssigned: !!shippingRequest.destinationWarehouse,
      warehouse: shippingRequest.destinationWarehouse || null,
    };

    return NextResponse.json(
      {
        sourceWarehouse: sourceStatus,
        destinationWarehouse: destinationStatus,
        needsAnyAssignment:
          sourceStatus.needsAssignment || destinationStatus.needsAssignment,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
