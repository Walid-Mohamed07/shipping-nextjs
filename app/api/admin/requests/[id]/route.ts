import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Driver, Request } from "@/lib/models";

function isMongoId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function findRequestById(id: string) {
  const publicIdRequest = await Request.findOne({ publicId: id })
    .populate("user", "fullName email mobile profilePicture role")
    .exec();

  if (publicIdRequest || !isMongoId(id)) {
    return publicIdRequest;
  }

  return Request.findById(id)
    .populate("user", "fullName email mobile profilePicture role")
    .exec();
}

async function findDriver(driverId?: string) {
  if (!driverId) return null;

  const conditions: any[] = [{ userId: driverId }, { email: driverId }];
  if (isMongoId(driverId)) {
    conditions.unshift({ _id: driverId });
  }

  return Driver.findOne({ $or: conditions }).lean();
}

function serializeStatusHistory(history: any[] = []) {
  return history.map((entry: any) => ({
    ...entry,
    changedAt: entry.changedAt || entry.timestamp,
    changedBy: entry.changedBy || null,
    note: entry.note ?? entry.reason ?? null,
  }));
}

function serializeCostOffer(offer: any) {
  const driverId = offer.driverId || offer.driver?.id;
  return {
    ...offer,
    driverId,
    driver: offer.driver,
    selected: offer.selected || false,
  };
}

function serializeRequest(foundRequest: any) {
  const requestObject = foundRequest.toObject
    ? foundRequest.toObject()
    : foundRequest;
  const id = requestObject._id?.toString() || requestObject.id;

  return {
    ...requestObject,
    id,
    _id: id,
    estimatedCost: requestObject.estimatedCost || requestObject.cost,
    requestStatusHistory: serializeStatusHistory(
      requestObject.requestStatusHistory,
    ),
    deliveryStatusHistory: serializeStatusHistory(
      requestObject.deliveryStatusHistory,
    ),
    costOffers: (requestObject.costOffers || []).map(serializeCostOffer),
  };
}

function buildDriverSnapshot(driverId: string | undefined, driver: any) {
  if (driver) {
    return {
      id: driver._id?.toString() || driver.id || driver.userId || driverId,
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      email: driver.email,
      address: driver.address,
      rate: String(driver.rate ?? ""),
    };
  }

  return {
    id: driverId,
    name: "Unknown Driver",
    phoneNumber: "",
    email: "",
    address: "",
    rate: "",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    const foundRequest = await findRequestById(id);
    if (!foundRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      { request: serializeRequest(foundRequest) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching request:", error);
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const currentRequest = await findRequestById(id);
    if (!currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const now = new Date();
    const operatorId = "operator-001"; // In real app, get from auth context

    if (body.costOffers && Array.isArray(body.costOffers)) {
      currentRequest.costOffers = currentRequest.costOffers || [];
      for (const newOffer of body.costOffers) {
        const driverId = newOffer.driverId || newOffer.driver?.id;
        const driver = await findDriver(driverId);
        const driverSnapshot =
          newOffer.driver || buildDriverSnapshot(driverId, driver);

        const existingOfferIndex = currentRequest.costOffers.findIndex(
          (offer: any) =>
            offer.driver?.id === driverSnapshot.id ||
            offer.driverId === driverSnapshot.id,
        );
        const offerData = {
          cost: Number(newOffer.cost),
          currency: newOffer.currency || "USD",
          driver: driverSnapshot,
          comment: newOffer.comment,
          selected: newOffer.selected || false,
          status: newOffer.status || "pending",
          headoverPercentage: newOffer.headoverPercentage,
          headoverAmount: newOffer.headoverAmount,
          finalPrice: newOffer.finalPrice,
          createdAt: newOffer.createdAt || now,
          offeredAt: newOffer.offeredAt || now,
        };

        if (existingOfferIndex >= 0) {
          (currentRequest.costOffers as any)[existingOfferIndex] = {
            ...(currentRequest.costOffers[existingOfferIndex].toObject?.() ||
              currentRequest.costOffers[existingOfferIndex]),
            ...offerData,
          };
        } else {
          (currentRequest.costOffers as any).push(offerData);
        }
      }

      if (currentRequest.requestStatus === "Accepted") {
        currentRequest.requestStatus = "Action needed";
        currentRequest.requestStatusHistory =
          currentRequest.requestStatusHistory || [];
        currentRequest.requestStatusHistory.push({
          status: "Action needed",
          timestamp: now,
          role: "operator",
          reason: `Cost offers set by operator with ${currentRequest.costOffers.length} offer(s)`,
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
        timestamp: now,
        role: "operator",
        reason: body.note || null,
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
        timestamp: now,
        role: "operator",
        reason: null,
      });
      currentRequest.deliveryFlow = currentRequest.deliveryFlow || [];
      currentRequest.deliveryFlow.push(body.deliveryStatus);
      currentRequest.deliveryCompletedStatuses =
        currentRequest.deliveryCompletedStatuses || [];
      currentRequest.deliveryCompletedStatuses.push(body.deliveryStatus);
    }

    currentRequest.updatedAt = now;
    await currentRequest.save();
    await currentRequest.populate(
      "user",
      "fullName email mobile profilePicture role",
    );

    return NextResponse.json(
      {
        success: true,
        request: serializeRequest(currentRequest),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating request:", error);
    return handleError(error);
  }
}
