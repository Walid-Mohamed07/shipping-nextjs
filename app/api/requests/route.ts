import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Request, User } from "@/lib/models";
import { handleError, handleValidationError } from "@/lib/apiHelpers";

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
        id: `ITEM-${req.id || Date.now()}-1`,
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
  const from = req.from ?? req.source;
  const to = req.to ?? req.destination;
  const source = req.source ?? req.from;
  const destination = req.destination ?? req.to;
  const items = normalizeItems(req);
  const deliveryType = normalizeDeliveryType(req.deliveryType);
  const startTime = req.startTime ?? req.whenToStart;
  const primaryCost = req.primaryCost ?? req.estimatedCost;
  const cost = req.cost ?? primaryCost;
  const requestStatus = req.requestStatus ?? req.orderStatus;

  return {
    id: req._id || req.id,
    userId: req.userId,
    from,
    to,
    source,
    destination,
    deliveryType,
    startTime,
    whenToStart: startTime,
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

    const query = userId ? { userId } : {};
    const requests = await Request.find(query);

    const normalized = requests.map((req: any) => normalizeRequest(req));

    const withUserData = await Promise.all(
      normalized.map(async (req: any) => {
        const user = await User.findById(req.userId);
        return {
          ...req,
          user: user ? { email: user.email, name: user.name } : null,
        };
      }),
    );

    return NextResponse.json({ requests: withUserData }, { status: 200 });
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
      userId,
      from,
      to,
      source,
      destination,
      items,
      deliveryType,
      whenToStart,
      startTime,
      cost,
      primaryCost,
      estimatedCost,
      orderStatus,
      requestStatus,
      deliveryStatus,
      comment,
    } = body;

    const sourceAddr = source ?? from;
    const destAddr = destination ?? to;
    const finalStartTime = startTime ?? whenToStart;
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

    const newRequest = await Request.create({
      userId,
      source: sourceAddr,
      destination: destAddr,
      items: items.map((item: any) => ({
        category: item.category,
        weight: item.weight,
        dimensions: item.dimensions,
        quantity: item.quantity,
      })),
      deliveryType: normalizedDeliveryType,
      startTime: finalStartTime,
      primaryCost: finalPrimaryCost,
      cost: finalCost,
      requestStatus: finalStatus || "Pending",
      deliveryStatus: deliveryStatus || "Pending",
      comment: comment || "",
    });

    return NextResponse.json(
      { success: true, request: normalizeRequest(newRequest) },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error, "Failed to create request");
  }
}
