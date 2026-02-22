import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Assignment, Request, User, Vehicle } from "@/lib/models";

/**
 * @swagger
 * /api/admin/assign:
 *   post:
 *     summary: Assign a driver and vehicle to a request
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId, driverId, vehicleId, estimatedDelivery]
 *             properties:
 *               requestId:
 *                 type: string
 *               driverId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *               estimatedDelivery:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Assignment already exists
 *       500:
 *         description: Failed to create assignment
 *   get:
 *     summary: Get all assignments with enriched data
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of assignments with driver and vehicle details
 *       500:
 *         description: Failed to fetch assignments
 */

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { requestId, driverId, vehicleId, estimatedDelivery } = body;

    // Check if assignment already exists
    const existingAssignment = await Assignment.findOne({ requestId });
    if (existingAssignment) {
      return NextResponse.json(
        { error: "Assignment already exists for this request" },
        { status: 400 },
      );
    }

    // Create new assignment
    const newAssignment = await Assignment.create({
      requestId,
      driverId,
      vehicleId,
      status: "Assigned",
      assignedAt: new Date(),
      estimatedDelivery: new Date(estimatedDelivery),
    });

    // Update request delivery status
    await Request.findOneAndUpdate(
      { _id: requestId },
      { deliveryStatus: "In Transit", updatedAt: new Date() },
    );

    return NextResponse.json(
      {
        success: true,
        assignment: newAssignment,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all assignments with populated references
    const assignments = await Assignment.find({})
      .populate("requestId", "source destination")
      .populate("driverId", "fullName")
      .populate("vehicleId", "type plateNumber")
      .lean();

    // Enrich assignments with display data
    const enrichedAssignments = assignments.map((a: any) => ({
      ...a,
      driverName: a.driverId?.fullName || "Unknown",
      vehicleName: a.vehicleId?.type || "Unknown",
      vehiclePlate: a.vehicleId?.plateNumber || "Unknown",
      from: a.requestId?.source?.city || "Unknown",
      to: a.requestId?.destination?.city || "Unknown",
    }));

    return NextResponse.json(
      { assignments: enrichedAssignments },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
