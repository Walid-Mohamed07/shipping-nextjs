import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/driver/ongoing:
 *   get:
 *     summary: Get ongoing requests for a driver
 *     tags: [Driver]
 *     parameters:
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ongoing requests
 *       400:
 *         description: Missing driverId
 *       500:
 *         description: Failed to fetch ongoing requests
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { error: "driverId is required" },
        { status: 400 },
      );
    }

    // Find ongoing requests assigned to this driver user
    // Note: assignedDriver is stored as the driver user's ID (string)
    // Also check selectedDriver.id as a fallback for robustness
    console.log("[Ongoing API] Querying for driverId:", driverId);

    // Query both assignedDriver and selectedDriver.id to ensure we catch all cases
    const ongoingRequests = await Request.find({
      $and: [
        {
          $or: [
            { assignedDriver: driverId },
            { "selectedDriver.id": driverId },
          ],
        },
        {
          requestStatus: {
            $in: ["Assigned to Driver", "In Transit", "Delivered", "In Progress"],
          },
        },
      ],
    })
      .populate("user", "email fullName profilePicture mobile")
      .sort({ createdAt: -1 })
      .lean();

    console.log("[Ongoing API] Found requests:", ongoingRequests.length);
    
    // Log detailed info for debugging
    if (ongoingRequests.length > 0) {
      console.log(
        "[Ongoing API] Request details:",
        ongoingRequests.map((r: any) => ({
          id: r._id.toString(),
          publicId: r.publicId,
          assignedDriver: r.assignedDriver,
          selectedDriverId: r.selectedDriver?.id,
          requestStatus: r.requestStatus,
          deliveryStatus: r.deliveryStatus,
        })),
      );
    } else {
      console.log(
        "[Ongoing API] No requests found. Checking if any requests have this driver assigned..."
      );
      // Debug query to see what's in the database
      const debugRequests = await Request.find({
        $or: [
          { assignedDriver: driverId },
          { "selectedDriver.id": driverId },
        ],
      })
        .select("_id publicId assignedDriver selectedDriver requestStatus")
        .lean();
      console.log(
        "[Ongoing API] All requests with this driver (any status):",
        debugRequests.map((r: any) => ({
          id: r._id.toString(),
          publicId: r.publicId,
          assignedDriver: r.assignedDriver,
          selectedDriverId: r.selectedDriver?.id,
          requestStatus: r.requestStatus,
        })),
      );
    }

    // Convert _id to id for consistency with frontend expectations
    const normalizedRequests = ongoingRequests.map((req: any) => ({
      ...req,
      id: req._id.toString(),
    }));

    return NextResponse.json({ requests: normalizedRequests }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
