import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Request, User } from "@/lib/models";
import { handleError, handleValidationError } from "@/lib/apiHelpers";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";
import {
  broadcastEvent,
  broadcastToDrivers,
  broadcastToAdmins,
} from "@/lib/eventBroadcaster";

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

  if (
    req.item ||
    req.category ||
    req.dimensions ||
    req.weight ||
    req.quantity
  ) {
    const media = Array.isArray(req.media)
      ? req.media.map((m: any) =>
          typeof m === "string" ? { url: m, existing: true } : m,
        )
      : [];

    return [
      {
        item: req.item ?? "-",
        name: req.item ?? "-",
        category: req.category ?? "",
        weight: req.weight ?? "",
        quantity: Number(req.quantity ?? 1) || 1,
        note: req.note || undefined,
        media: media.slice(0, 4),
      },
    ];
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

function normalizeRequest(req: any) {
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
    selectedDriver: req.selectedDriver,
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
    // Vehicle & workers
    transportVehicle: req.transportVehicle,
    workersCount: req.workersCount,
  };
}

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Get all requests
 *     description: Fetch shipping requests, optionally filtered by userId
 *     tags:
 *       - Requests
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter requests by user ID
 *     responses:
 *       200:
 *         description: Successfully retrieved requests
 *       500:
 *         description: Failed to fetch requests
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    // If no userId provided, this endpoint requires it
    if (!userId) {
      return handleValidationError("userId query parameter is required");
    }

    const requests = await Request.find({ user: userId })
      .populate("user", "fullName email mobile profilePicture role")
      .lean();

    const normalized = requests.map((req: any) => normalizeRequest(req));

    return NextResponse.json({ requests: normalized }, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch requests");
  }
}

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Create a new request
 *     description: Submit a new shipping request
 *     tags:
 *       - Requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               source:
 *                 type: object
 *               destination:
 *                 type: object
 *               items:
 *                 type: array
 *               deliveryType:
 *                 type: string
 *               startTime:
 *                 type: string
 *               cost:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      user,
      source,
      destination,
      items,
      deliveryType,
      scheduledDate,
      startTime,
      collectionAvailableDays,
      deliveryAvailableDays,
      availableDays, // backward compatibility
      cost,
      // primaryCost, // TEMPORARILY HIDDEN - primaryCost
      // estimatedCost, // TEMPORARILY HIDDEN - primaryCost
      orderStatus,
      requestStatus,
      deliveryStatus,
      comment,
      workersCount,
      transportVehicle,
      receiptFloorNumber,
      needsWinchPickup,
      deliveryFloorNumber,
      needsWinchDropoff,
    } = body;

    const sourceAddr = source;
    const destAddr = destination;
    const finalStartTime = startTime;
    // Support both new field names and legacy availableDays
    const finalCollectionDays = collectionAvailableDays || availableDays || [];
    const finalDeliveryDays = deliveryAvailableDays || [];
    // TEMPORARILY HIDDEN - primaryCost: Don't accept primaryCost from frontend
    // const finalPrimaryCost = primaryCost ?? estimatedCost;
    const finalCost = cost; // TEMPORARILY HIDDEN - primaryCost
    const finalStatus = requestStatus ?? orderStatus;

    const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
    if (!normalizedDeliveryType) {
      return handleValidationError(
        "deliveryType is required (Normal | Urgent | Scheduled)",
      );
    }
    // Validate scheduledDate when deliveryType is Scheduled
    if (normalizedDeliveryType === "Scheduled" && !scheduledDate) {
      return handleValidationError(
        "scheduledDate is required for Scheduled delivery",
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return handleValidationError("At least one item is required");
    }

    for (const it of items) {
      const mediaArr = Array.isArray(it?.media) ? it.media : [];
      if (mediaArr.length > 4) {
        return handleValidationError("media.length must be <= 4 per item");
      }
    }

    // Extract pickup modes from source and destination
    const sourcePickupMode = sourceAddr?.pickupMode || "Self";
    const destinationPickupMode = destAddr?.pickupMode || "Self";

    const newRequest = await Request.create({
      user: user,
      source: sourceAddr,
      destination: destAddr,
      items: items.map((item: any) => ({
        item: item.item ?? item.name ?? "-",
        name: item.name ?? item.item ?? "-",
        category: item.category || "",
        weight: item.weight || "",
        quantity: Number(item.quantity ?? 1) || 1,
        note: item.note || undefined,
        media: Array.isArray(item.media) ? item.media.slice(0, 4) : [],
      })),
      deliveryType: normalizedDeliveryType,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      startTime: finalStartTime,
      collectionAvailableDays: finalCollectionDays,
      deliveryAvailableDays: finalDeliveryDays,
      // primaryCost: finalPrimaryCost, // TEMPORARILY HIDDEN - primaryCost
      cost: finalCost,
      requestStatus: finalStatus || "Pending",
      deliveryStatus: deliveryStatus || "Pending",
      comment: comment || "",
      sourcePickupMode,
      destinationPickupMode,
      receiptFloorNumber: receiptFloorNumber || undefined,
      needsWinchPickup: !!needsWinchPickup,
      deliveryFloorNumber: deliveryFloorNumber || undefined,
      needsWinchDropoff: !!needsWinchDropoff,
      workersCount:
        typeof workersCount === "number"
          ? Math.min(6, Math.max(0, workersCount))
          : 0,
      transportVehicle: transportVehicle
        ? {
            id: transportVehicle.id,
            nameEn: transportVehicle.nameEn,
            nameAr: transportVehicle.nameAr,
            dimensions: transportVehicle.dimensions,
            maxWeight: transportVehicle.maxWeight,
          }
        : undefined,
    });

    // Add activity log for request creation
    await addActivityLog(
      newRequest._id.toString(),
      ActivityActions.REQUEST_CREATED(user),
    );

    // Broadcast real-time event for new request
    const normalizedRequest = normalizeRequest(newRequest);
    broadcastEvent("REQUEST_CREATED", normalizedRequest, {
      requestId: newRequest._id.toString(),
      userId: user,
      targetRoles: ["admin", "operator", "driver"],
    });
    broadcastToAdmins(
      "REQUEST_CREATED",
      normalizedRequest,
      newRequest._id.toString(),
    );

    return NextResponse.json(
      { success: true, request: normalizedRequest },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error, "Failed to create request");
  }
}
