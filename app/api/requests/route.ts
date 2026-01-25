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
    const {
      userId,
      from,
      to,
      item,
      category,
      dimensions,
      weight,
      quantity,
      estimatedCost,
      estimatedTime,
    } = body;

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const newRequest = {
      id: `REQ-${Date.now()}`,
      userId,
      from,
      to,
      item,
      category,
      dimensions,
      weight,
      quantity,
      estimatedCost,
      estimatedTime,
      orderStatus: "Pending",
      deliveryStatus: "Pending",
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
