import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type LegacyRequest = any;

function normalizeItems(req: LegacyRequest) {
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
      services: it.services || { assemblyDisassembly: false, packaging: false },
    }));
  }
  if (
    req.item ||
    req.category ||
    req.dimensions ||
    req.weight ||
    req.quantity
  ) {
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
        services: { assemblyDisassembly: false, packaging: false },
      },
    ];
  }
  return [];
}

function normalizeDeliveryType(value: any): "Normal" | "Urgent" | undefined {
  const v = String(value || "")
    .toLowerCase()
    .trim();
  if (v === "urgent") return "Urgent";
  if (v === "normal") return "Normal";
  return undefined;
}

function normalizeRequest(req: LegacyRequest) {
  const from = req.from ?? req.source;
  const to = req.to ?? req.destination;
  const source = req.source ?? req.from;
  const destination = req.destination ?? req.to;
  const items = normalizeItems(req);
  const deliveryType = normalizeDeliveryType(req.deliveryType);
  const startTime = req.startTime || undefined;
  const primaryCost = req.primaryCost ?? req.estimatedCost ?? undefined;
  const cost = req.cost ?? primaryCost;
  return {
    id: req.id,
    userId: req.userId,
    from,
    to,
    source,
    destination,
    deliveryType,
    startTime,
    primaryCost,
    cost,
    requestStatus: req.requestStatus,
    deliveryStatus: req.deliveryStatus,
    items,
    costOffers: req.costOffers || undefined,
    comment: req.comment || undefined,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    selectedCompany: req.selectedCompany || undefined,
    activityHistory: req.activityHistory || undefined,
    sourceWarehouse: req.sourceWarehouse || undefined,
    destinationWarehouse: req.destinationWarehouse || undefined,
    assignedWarehouseId: req.assignedWarehouseId || undefined,
    assignedWarehouse: req.assignedWarehouse || undefined,
    sourcePickupMode: req.sourcePickupMode || undefined,
    destinationPickupMode: req.destinationPickupMode || undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const foundRequest = requestsData.requests.find(
      (req: any) => req.id === id,
    );

    if (!foundRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Always return the FINAL structure (normalized), even for legacy records.
    return NextResponse.json(
      { request: normalizeRequest(foundRequest) },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 },
    );
  }
}
