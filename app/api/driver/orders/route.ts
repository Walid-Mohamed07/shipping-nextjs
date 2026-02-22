import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Assignment, Request, User, Vehicle } from "@/lib/models";

/**
 * @swagger
 * /api/driver/orders:
 *   get:
 *     summary: Get all orders assigned to a driver
 *     tags: [Driver]
 *     parameters:
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of driver assignments with request details
 *       400:
 *         description: Driver ID is required
 *       500:
 *         description: Failed to fetch orders
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const driverId = request.nextUrl.searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 },
      );
    }

    // Get assignments for this driver with populated data
    const assignments = await Assignment.find({ driverId })
      .populate("requestId", "source destination userId status")
      .populate("vehicleId", "type plateNumber")
      .lean();

    return NextResponse.json({ orders: assignments }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
