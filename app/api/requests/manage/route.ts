import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const usersPath = path.join(process.cwd(), "data", "users.json");
    const locationsPath = path.join(process.cwd(), "data", "locations.json");

    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));
    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
    const locationsData = JSON.parse(fs.readFileSync(locationsPath, "utf-8"));

    let results = requestsData.requests;
    if (status) {
      results = results.filter(
        (r: any) => r.requestStatus === status || r.orderStatus === status,
      );
    }

    // Populate user information for each request
    const resultsWithUsers = results.map((req: any) => {
      const user = usersData.users.find((u: any) => u.id === req.userId);
      // Get user locations
      const userLocations = locationsData.locations.filter(
        (loc: any) => loc.userId === req.userId,
      );
      return {
        ...req,
        user: user
          ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              mobile: user.mobile,
              profilePicture: user.profilePicture,
              role: user.role,
            }
          : null,
        locations: userLocations,
      };
    });

    // Normalize to the shape the client expects (keep legacy compatibility)
    return NextResponse.json(resultsWithUsers, { status: 200 });
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
    const requestId = body.requestId;

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const requestIndex = requestsData.requests.findIndex(
      (r: any) => r.id === requestId,
    );
    if (requestIndex === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const currentRequest = requestsData.requests[requestIndex];
    const now = new Date().toISOString();
    const operatorId = "operator-001"; // In real app, get from auth context

    // Update cost offers
    if (body.costOffers && Array.isArray(body.costOffers)) {
      currentRequest.costOffers = currentRequest.costOffers || [];
      body.costOffers.forEach((newOffer: any) => {
        const existingOfferIndex = currentRequest.costOffers.findIndex(
          (o: any) => o.companyId === newOffer.companyId,
        );
        if (existingOfferIndex >= 0) {
          currentRequest.costOffers[existingOfferIndex] = {
            ...currentRequest.costOffers[existingOfferIndex],
            ...newOffer,
          };
        } else {
          currentRequest.costOffers.push(newOffer);
        }
      });

      // Auto-set status to "Action needed" when cost offers are added
      if (currentRequest.requestStatus === "Accepted") {
        currentRequest.requestStatus = "Action needed";
        currentRequest.requestStatusHistory =
          currentRequest.requestStatusHistory || [];
        currentRequest.requestStatusHistory.push({
          status: "Action needed",
          changedAt: now,
          changedBy: operatorId,
          role: "operator",
          note: `Cost offers set by operator with ${currentRequest.costOffers.length} offer(s)`,
        });
        currentRequest.orderFlow = currentRequest.orderFlow || [];
        currentRequest.orderFlow.push("Action needed");
      }
    }

    // Update request status
    if (
      body.requestStatus &&
      body.requestStatus !== currentRequest.requestStatus
    ) {
      currentRequest.requestStatus = body.requestStatus;
      currentRequest.requestStatusHistory =
        currentRequest.requestStatusHistory || [];
      currentRequest.requestStatusHistory.push({
        status: body.requestStatus,
        changedAt: now,
        changedBy: operatorId,
        role: "operator",
        note: body.note || null,
      });
      currentRequest.orderFlow = currentRequest.orderFlow || [];
      currentRequest.orderFlow.push(body.requestStatus);
      currentRequest.orderCompletedStatuses =
        currentRequest.orderCompletedStatuses || [];
      currentRequest.orderCompletedStatuses.push(body.requestStatus);
    }

    // Update delivery status
    if (
      body.deliveryStatus &&
      body.deliveryStatus !== currentRequest.deliveryStatus
    ) {
      currentRequest.deliveryStatus = body.deliveryStatus;
      currentRequest.deliveryStatusHistory =
        currentRequest.deliveryStatusHistory || [];
      currentRequest.deliveryStatusHistory.push({
        status: body.deliveryStatus,
        changedAt: now,
        changedBy: operatorId,
        role: "operator",
        note: null,
      });
      currentRequest.deliveryFlow = currentRequest.deliveryFlow || [];
      currentRequest.deliveryFlow.push(body.deliveryStatus);
      currentRequest.deliveryCompletedStatuses =
        currentRequest.deliveryCompletedStatuses || [];
      currentRequest.deliveryCompletedStatuses.push(body.deliveryStatus);
    }

    currentRequest.updatedAt = now;

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    // Get user data for the request
    const usersPath = path.join(process.cwd(), "data", "users.json");
    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
    const user = usersData.users.find(
      (u: any) => u.id === currentRequest.userId,
    );

    return NextResponse.json(
      {
        success: true,
        request: {
          ...currentRequest,
          user: user || null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 },
    );
  }
}
