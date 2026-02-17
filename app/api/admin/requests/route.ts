import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     summary: Get all shipping requests with detailed information
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all requests
 *       500:
 *         description: Failed to fetch requests
 *   put:
 *     summary: Update request or delivery status
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *               requestStatus:
 *                 type: string
 *               deliveryStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request updated successfully
 *       404:
 *         description: Request not found
 *       500:
 *         description: Failed to update request
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const filter: any = {};
    if (status) {
      filter.$or = [{ requestStatus: status }, { deliveryStatus: status }];
    }

    // Return all requests with populated user data
    const requests = await Request.find(filter)
      .populate("userId", "fullName email mobile profilePicture role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, requestStatus, deliveryStatus } = body;

    const updateData: any = {};
    if (requestStatus) updateData.requestStatus = requestStatus;
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;
    updateData.updatedAt = new Date();

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true },
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, request: updatedRequest },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
