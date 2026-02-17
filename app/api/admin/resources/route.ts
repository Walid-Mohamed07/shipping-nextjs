import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Vehicle, User } from "@/lib/models";

/**
 * @swagger
 * /api/admin/resources:
 *   get:
 *     summary: Get system resources (vehicles, drivers)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Resources list
 *       500:
 *         description: Failed to fetch resources
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const vehicles = await Vehicle.find({}).lean();
    const drivers = await User.find({ role: "driver" })
      .select("fullName email status")
      .lean();

    return NextResponse.json(
      {
        vehicles,
        drivers,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
