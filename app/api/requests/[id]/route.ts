import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request, User, Settings } from "@/lib/models";
import { handleValidationError } from "@/lib/apiHelpers";
import { getCurrentUser, isUserAuthorizedForRequest } from "@/lib/auth-helpers";

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
        weight: it.weight ?? "",
        quantity: Number(it.quantity ?? 1) || 1,
        note: it.note || undefined,
        media: normalizedMedia.slice(0, 4),
      };
    });
  }
  return [];
}

function normalizeDeliveryType(
  value: any,
): "Normal" | "Urgent" | "Scheduled" | undefined {
  const v = String(value || "")
    .toLowerCase()
    .trim();
  if (v === "urgent" || v === "fast") return "Urgent";
  if (v === "scheduled") return "Scheduled";
  if (v === "normal") return "Normal";
  return undefined;
}

function normalizeRequest(req: LegacyRequest) {
  const source = req.source;
  const destination = req.destination;
  const items = normalizeItems(req);
  const deliveryType = normalizeDeliveryType(req.deliveryType);
  const startTime = req.startTime;
  const collectionAvailableDays =
    req.collectionAvailableDays || req.availableDays || [];
  const deliveryAvailableDays = req.deliveryAvailableDays || [];
  const primaryCost = req.primaryCost ?? req.estimatedCost;
  const cost = req.cost ?? primaryCost;
  const requestStatus = req.requestStatus ?? req.orderStatus;

  return {
    id: req._id || req.id,
    publicId: req.publicId,
    user: req.user,
    source,
    destination,
    deliveryType,
    scheduledDate: req.scheduledDate,
    startTime,
    collectionAvailableDays,
    deliveryAvailableDays,
    // primaryCost, // TEMPORARILY HIDDEN - primaryCost
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
    // Floor number and winch fields
    receiptFloorNumber: req.receiptFloorNumber,
    needsWinchPickup: req.needsWinchPickup,
    deliveryFloorNumber: req.deliveryFloorNumber,
    needsWinchDropoff: req.needsWinchDropoff,
    // Payment fields
    paymentStatus: req.paymentStatus,
    paymentId: req.paymentId,
    paidAmount: req.paidAmount,
    paidAt: req.paidAt,
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

    // Get current user for authorization check
    const currentUser = await getCurrentUser(request);

    // Try to find by publicId first (new format: REQ-XXXXX)
    // If not found and id looks like MongoDB ID, try that for backward compatibility
    let foundRequest = await Request.findOne({ publicId: id })
      .populate("user", "fullName email mobile profilePicture role _id")
      .lean()
      .exec();

    // Backward compatibility: try to find by _id if publicId not found
    if (!foundRequest && id.match(/^[0-9a-fA-F]{24}$/)) {
      foundRequest = await Request.findById(id)
        .populate("user", "fullName email mobile profilePicture role _id")
        .lean()
        .exec();
    }

    if (!foundRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check authorization: user must be the owner or an admin
    const requestOwnerId =
      foundRequest.user?._id || foundRequest.user?.id || foundRequest.user;
    const requestOwnerIdString =
      requestOwnerId?.toString?.() || String(requestOwnerId);

    if (!currentUser) {
      // If no auth token, return 401 Unauthorized
      // (but still allow public access if needed - for now requiring auth)
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const isAuthorized = isUserAuthorizedForRequest(
      currentUser.id,
      currentUser.role,
      requestOwnerIdString,
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden - you do not have access to this request" },
        { status: 403 },
      );
    }

    // Fetch headover percentage from settings
    let headoverPercentage = 0;
    try {
      const settings = await Settings.findOne({ key: "global" }).lean().exec();
      if (settings && typeof settings.headoverPercentage === "number") {
        headoverPercentage = settings.headoverPercentage;
      }
    } catch (settingsError) {
      console.error(
        "[GET Request] Failed to fetch headover settings:",
        settingsError,
      );
      // Continue with 0% headover if settings fetch fails
    }

    const normalized = normalizeRequest(foundRequest);

    // Add finalPrice (with headover) to each cost offer for client display
    if (normalized.costOffers && Array.isArray(normalized.costOffers)) {
      normalized.costOffers = normalized.costOffers.map((offer: any) => ({
        ...offer,
        finalPrice: offer.cost * (1 + headoverPercentage / 100),
        headoverPercentage: headoverPercentage,
      }));
    }

    return NextResponse.json(
      {
        request: normalized,
        headoverPercentage: headoverPercentage,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
