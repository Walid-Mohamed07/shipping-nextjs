import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Request, User } from "@/lib/models";
import { handleError, handleValidationError } from "@/lib/apiHelpers";
import { ActivityActions, addActivityLog } from "@/lib/activityLogger";

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
        dimensions: it.dimensions ?? "",
        weight: it.weight ?? "",
        quantity: Number(it.quantity ?? 1) || 1,
        note: it.note || undefined,
        media: normalizedMedia.slice(0, 4),
        services: it.services || {
          assemblyDisassembly: false,
          packaging: false,
        },
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
        dimensions: req.dimensions ?? "",
        weight: req.weight ?? "",
        quantity: Number(req.quantity ?? 1) || 1,
        note: req.note || undefined,
        media: media.slice(0, 4),
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
  if (v === "urgent" || v === "fast") return "Urgent";
  if (v === "normal") return "Normal";
  return undefined;
}

function normalizeRequest(req: any) {
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
      startTime,
      cost,
      primaryCost,
      estimatedCost,
      orderStatus,
      requestStatus,
      deliveryStatus,
      comment,
    } = body;

    const sourceAddr = source;
    const destAddr = destination;
    const finalStartTime = startTime;
    const finalPrimaryCost = primaryCost ?? estimatedCost;
    const finalCost = cost ?? finalPrimaryCost;
    const finalStatus = requestStatus ?? orderStatus;

    const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
    if (!normalizedDeliveryType) {
      return handleValidationError("deliveryType is required (normal | fast)");
    }
    if (!finalStartTime) {
      return handleValidationError("startTime is required");
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
        dimensions: item.dimensions || "",
        quantity: Number(item.quantity ?? 1) || 1,
        note: item.note || undefined,
        media: Array.isArray(item.media) ? item.media.slice(0, 4) : [],
        services: item.services || {
          canBeAssembledDisassembled: false,
          assemblyDisassemblyHandler: undefined,
          packaging: false,
        },
      })),
      deliveryType: normalizedDeliveryType,
      startTime: finalStartTime,
      primaryCost: finalPrimaryCost,
      cost: finalCost,
      requestStatus: finalStatus || "Pending",
      deliveryStatus: deliveryStatus || "Pending",
      comment: comment || "",
      sourcePickupMode,
      destinationPickupMode,
    });

    // Add activity log for request creation
    await addActivityLog(newRequest._id, ActivityActions.REQUEST_CREATED(user));

    return NextResponse.json(
      { success: true, request: normalizeRequest(newRequest) },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error, "Failed to create request");
  }
}
