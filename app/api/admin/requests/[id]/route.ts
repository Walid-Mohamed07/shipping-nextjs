import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const requestId = id;
    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));
    const companiesPath = path.join(process.cwd(), "data", "companies.json");
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

    const foundRequest = requestsData.requests.find(
      (r: any) => r.id === requestId,
    );
    if (!foundRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Enrich cost offers with company data
    const enrichedRequest = {
      ...foundRequest,
      costOffers: (foundRequest.costOffers || []).map((offer: any) => {
        const company = companiesData.companies.find(
          (c: any) => c.id === (offer.companyId || offer.company?.id),
        );
        return {
          cost: offer.cost,
          companyId: offer.companyId || offer.company?.id,
          company: company,
          comment: offer.comment,
          selected: offer.selected || false,
        };
      }),
    };

    return NextResponse.json({ request: enrichedRequest }, { status: 200 });
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const requestId = id;
    const body = await request.json();

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

    return NextResponse.json(
      {
        success: true,
        request: currentRequest,
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
