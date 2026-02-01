import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const filteredRequests = userId
      ? requestsData.requests.filter((req: any) => req.userId === userId)
      : requestsData.requests;

    return NextResponse.json({ requests: filteredRequests }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept both 'from'/'to' and 'source'/'destination' (form sends source/destination)
    const {
      userId,
      from,
      to,
      source,
      destination,
      item,
      category,
      dimensions,
      weight,
      quantity,
      items,
      estimatedCost,
      estimatedTime,
      orderStatus,
      deliveryStatus,
      sourceAddress,
      sourcePostalCode,
      address,
      country,
      postalCode,
      mobile,
      warehouseId,
      pickupMode,
      ...rest
    } = body;

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const fromAddr = from ?? source;
    const toAddr = to ?? destination;
    const firstItem = Array.isArray(items) && items[0] ? items[0] : { item, category, dimensions, weight, quantity };

    const newRequest = {
      id: `REQ-${Date.now()}`,
      userId,
      from: fromAddr,
      to: toAddr,
      item: firstItem?.item ?? item,
      category: firstItem?.category ?? category,
      dimensions: firstItem?.dimensions ?? dimensions,
      weight: firstItem?.weight ?? weight,
      quantity: firstItem?.quantity ?? quantity,
      estimatedCost,
      estimatedTime,
      orderStatus: orderStatus || "Pending",
      deliveryStatus: deliveryStatus || "Pending",
      sourceAddress,
      sourcePostalCode,
      address,
      country,
      postalCode,
      mobile,
      warehouseId,
      pickupMode,
      ...rest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requestsData.requests.push(newRequest);
    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json(
      { success: true, request: newRequest },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 },
    );
  }
}
