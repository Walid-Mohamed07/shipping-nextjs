import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, User } from "@/lib/models";
import { handleValidationError } from "@/lib/apiHelpers";

type LegacyRequest = any;

function normalizeItems(req: LegacyRequest) {
  if (Array.isArray(req.items) && req.items.length > 0) {
    return req.items.map((it: any, idx: number) => {
      let normalizedMedia = [];
      if (Array.isArray(it.media)) {
        normalizedMedia = it.media.map((m: any) => {
          if (typeof m === "string") {
            return { url: m, existing: true };
          }
          return m;
        });
      }

      return {
        id: it.id || `ITEM-${req.id || Date.now()}-${idx + 1}`,
        item: it.item ?? it.name ?? "-",
        name: it.name ?? it.item ?? "-",
        category: it.category ?? "",
        dimensions: it.dimensions ?? "",
        weight: it.weight ?? "",
        quantity: Number(it.quantity ?? 1) || 1,
        note: it.note || undefined,
        media: normalizedMedia.slice(0, 4),
        services: it.services || {
          canBeAssembledDisassembled: false,
          packaging: false,
        },
      };
    });
  }
  return [];
}

function normalizeDeliveryType(value: any): "Normal" | "Urgent" | undefined {
  const v = String(value || "")
    .toLowerCase()
    .trim();
  if (v === "urgent" || v === "fast") return "Urgent";
  if (v === "normal") return "Normal";
  return undefined;
}

function normalizeRequest(req: LegacyRequest) {
  const source = req.source;
  const destination = req.destination;
  const items = normalizeItems(req);
  const deliveryType = normalizeDeliveryType(req.deliveryType);
  const startTime = req.startTime;
  const primaryCost = req.primaryCost ?? req.estimatedCost;
  const cost = req.cost ?? primaryCost;
  const requestStatus = req.requestStatus ?? req.orderStatus;

  return {
    id: req._id || req.id,
    user: req.user,
    source,
    destination,
    deliveryType,
    startTime,
    primaryCost,
    cost,
    requestStatus,
    orderStatus: requestStatus,
    deliveryStatus: req.deliveryStatus,
    comment: req.comment,
    items,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    costOffers: req.costOffers,
    activityHistory: req.activityHistory,
    selectedCompany: req.selectedCompany,
    sourceWarehouse: req.sourceWarehouse,
    destinationWarehouse: req.destinationWarehouse,
    assignedWarehouseId: req.assignedWarehouseId,
    assignedWarehouse: req.assignedWarehouse,
    sourcePickupMode: req.sourcePickupMode,
    destinationPickupMode: req.destinationPickupMode,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!id) {
      return handleValidationError("Request ID is required");
    }

    const foundRequest = await Request.findById(id)
      .populate("user", "fullName email mobile profilePicture role")
      .lean()
      .exec();

    if (!foundRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const normalized = normalizeRequest(foundRequest);

    return NextResponse.json({ request: normalized }, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch request");
  }
}
