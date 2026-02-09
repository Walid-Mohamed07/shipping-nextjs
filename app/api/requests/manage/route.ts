import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    let results = requestsData.requests;
    if (status) {
      results = results.filter(
        (r: any) => r.requestStatus === status || r.orderStatus === status,
      );
    }

    // Normalize to the shape the client expects (keep legacy compatibility)
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error in manage GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, costOffers, userId } = body;
    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 },
      );
    }

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const idx = requestsData.requests.findIndex((r: any) => r.id === requestId);
    if (idx === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Attach costOffers and mark as needing action
    requestsData.requests[idx].costOffers = Array.isArray(costOffers)
      ? costOffers
      : [];
    requestsData.requests[idx].requestStatus = "Action needed";
    requestsData.requests[idx].updatedAt = new Date().toISOString();

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json(
      { success: true, request: requestsData.requests[idx] },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in manage PUT:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 },
    );
  }
}
