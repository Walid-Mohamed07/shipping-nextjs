import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/driver/ongoing/{id}:
 *   get:
 *     summary: Get a specific ongoing request for a driver
 *     tags: [Driver]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ongoing request details
 *       400:
 *         description: Missing driverId
 *       403:
 *         description: Unauthorized - request not assigned to this driver
 *       404:
 *         description: Request not found
 *       500:
 *         description: Failed to fetch request
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { error: "driverId is required" },
        { status: 400 },
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 },
      );
    }

    // Find the request and verify it's assigned to this driver
    // Check both assignedDriver and selectedDriver.id for robustness
    const ongoingRequest = await Request.findOne({
      _id: id,
      $or: [
        { assignedDriver: driverId },
        { "selectedDriver.id": driverId },
      ],
      requestStatus: {
        $in: ["Assigned to Driver", "In Transit", "Delivered", "In Progress"],
      },
    })
      .populate("user", "email fullName phone mobile")
      .lean();

    if (!ongoingRequest) {
      console.log(
        `[Ongoing Detail] Request not found for id: ${id}, driverId: ${driverId}`
      );
      return NextResponse.json(
        {
          error:
            "Request not found or you don't have permission to access it",
        },
        { status: 404 },
      );
    }

    console.log(
      `[Ongoing Detail] Found request ${id}, assignedDriver: ${(ongoingRequest as any).assignedDriver}, selectedDriver.id: ${(ongoingRequest as any).selectedDriver?.id}`
    );

    // Convert _id to id for consistency with frontend expectations
    const normalizedRequest = {
      ...ongoingRequest,
      id: ongoingRequest._id.toString(),
    };

    return NextResponse.json({ request: normalizedRequest }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
