import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type LegacyRequest = any;

function normalizeItems(req: LegacyRequest) {
  // Preferred: items[] already exists
  if (Array.isArray(req.items) && req.items.length > 0) {
    return req.items.map((it: any, idx: number) => ({
      id: it.id || `ITEM-${req.id || Date.now()}-${idx + 1}`,
      name: it.name ?? it.item ?? "-",
      category: it.category ?? "",
      dimensions: it.dimensions ?? "",
      weight: it.weight ?? "",
      quantity: Number(it.quantity ?? 1) || 1,
      note: it.note || undefined,
      media: Array.isArray(it.media) ? it.media.slice(0, 4) : [],
    }));
  }

  // Legacy: single-item fields
  if (req.item || req.category || req.dimensions || req.weight || req.quantity) {
    return [
      {
        id: `ITEM-${req.id || Date.now()}-1`,
        name: req.item ?? "-",
        category: req.category ?? "",
        dimensions: req.dimensions ?? "",
        weight: req.weight ?? "",
        quantity: Number(req.quantity ?? 1) || 1,
        note: req.note || undefined,
        media: Array.isArray(req.media) ? req.media.slice(0, 4) : [],
      },
    ];
  }

  // No items
  return [];
}

function normalizeDeliveryType(value: any): "normal" | "fast" | undefined {
  const v = String(value || "").toLowerCase().trim();
  if (v === "fast") return "fast";
  if (v === "normal") return "normal";
  return undefined;
}

function normalizeRequest(req: LegacyRequest) {
  const from = req.from ?? req.source;
  const to = req.to ?? req.destination;
  const items = normalizeItems(req);
  const deliveryType = normalizeDeliveryType(req.deliveryType);
  const whenToStart = req.whenToStart || undefined;
  const primaryCost = req.primaryCost ?? req.estimatedCost ?? undefined;
  return {
    id: req.id,
    userId: req.userId,
    from,
    to,
    deliveryType,
    whenToStart,
    primaryCost,
    orderStatus: req.orderStatus,
    deliveryStatus: req.deliveryStatus,
    items,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const filteredRequests = userId
      ? requestsData.requests.filter((req: any) => req.userId === userId)
      : requestsData.requests;

    // Always return the FINAL structure (normalized), even for legacy records.
    const normalized = filteredRequests.map((req: any) => normalizeRequest(req));
    return NextResponse.json({ requests: normalized }, { status: 200 });
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
    // FINAL structure (request-level fields + items[])
    const {
      userId,
      from,
      to,
      source,
      destination,
      items,
      deliveryType,
      whenToStart,
      primaryCost,
      orderStatus,
      deliveryStatus,
    } = body;

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const fromAddr = from ?? source;
    const toAddr = to ?? destination;

    // Validate required request-level fields
    const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
    if (!normalizedDeliveryType) {
      return NextResponse.json(
        { error: "deliveryType is required (normal | fast)" },
        { status: 400 },
      );
    }
    if (!whenToStart) {
      return NextResponse.json(
        { error: "whenToStart is required" },
        { status: 400 },
      );
    }
    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    // Validate media length <= 4 per item
    for (const it of items) {
      const mediaArr = Array.isArray(it?.media) ? it.media : [];
      if (mediaArr.length > 4) {
        return NextResponse.json(
          { error: "media.length must be <= 4 per item" },
          { status: 400 },
        );
      }
    }

    const newRequest = {
      id: `REQ-${Date.now()}`,
      userId,
      from: fromAddr,
      to: toAddr,
      items: items.map((item: any) => ({
        id: item.id || `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.name || item.item,
        category: item.category,
        dimensions: item.dimensions,
        weight: item.weight,
        quantity: item.quantity,
        note: item.note || undefined,
        media: Array.isArray(item.media) ? item.media.slice(0, 4) : [],
      })),
      deliveryType: normalizedDeliveryType,
      whenToStart,
      primaryCost,
      orderStatus: orderStatus || "Pending",
      deliveryStatus: deliveryStatus || "Pending",
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
    console.error("Failed to create request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 },
    );
  }
}
