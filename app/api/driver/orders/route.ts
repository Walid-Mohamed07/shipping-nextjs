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

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const usersPath = path.join(process.cwd(), "data", "users.json");
    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));

    // Get assignments for this driver
    const driverAssignments = assignmentsData.assignments.filter(
      (a: any) => a.driverId === driverId,
    );

    // Enrich with request and vehicle details
    const enrichedOrders = driverAssignments.map((assignment: any) => {
      const shippingRequest = requestsData.requests.find(
        (r: any) => r.id === assignment.requestId,
      );
      const vehicle = vehiclesData.vehicles.find(
        (v: any) => v.id === assignment.vehicleId,
      );
      const client = usersData.users.find(
        (u: any) => u.id === shippingRequest?.userId,
      );

      return {
        ...assignment,
        request: shippingRequest,
        vehicle,
        clientName: client?.name || "Unknown",
        clientEmail: client?.email || "Unknown",
      };
    });

    return NextResponse.json({ orders: enrichedOrders }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
