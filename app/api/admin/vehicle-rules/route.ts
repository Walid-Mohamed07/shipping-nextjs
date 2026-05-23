import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { VehicleRule, Vehicle } from "@/lib/models";

function serializeRule(rule: any, vehicleName?: string) {
  const id = rule._id?.toString() || rule.id;
  return {
    ...rule,
    id,
    _id: id,
    vehicleName: rule.vehicleName || vehicleName || "Unknown Vehicle",
  };
}

/**
 * @swagger
 * /api/admin/vehicle-rules:
 *   get:
 *     summary: Get all vehicle rules
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of vehicle rules
 *       500:
 *         description: Failed to fetch rules
 *   post:
 *     summary: Create a new vehicle rule
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, maxWeight]
 *             properties:
 *               vehicleId:
 *                 type: string
 *               maxWeight:
 *                 type: number
 *               maxDimensions:
 *                 type: string
 *               allowedCategories:
 *                 type: array
 *     responses:
 *       201:
 *         description: Rule created successfully
 *       500:
 *         description: Failed to create rule
 */

export async function GET() {
  try {
    await connectDB();
    const [rules, vehicles] = await Promise.all([
      VehicleRule.find({}).lean(),
      Vehicle.find({}).select("name").lean(),
    ]);
    const vehicleNames = new Map(
      vehicles.map((vehicle: any) => [vehicle._id.toString(), vehicle.name]),
    );

    return NextResponse.json(
      {
        rules: rules.map((rule: any) =>
          serializeRule(rule, vehicleNames.get(rule.vehicleId)),
        ),
      },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      vehicleId,
      maxWeight,
      maxDimensions,
      allowedCategories,
      minDeliveryDays,
      maxDeliveryDays,
    } = body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const newRule = await VehicleRule.create({
      vehicleId,
      vehicleName: vehicle.name,
      maxWeight,
      maxDimensions: maxDimensions || "N/A",
      allowedCategories: allowedCategories || [],
      minDeliveryDays: minDeliveryDays || 1,
      maxDeliveryDays: maxDeliveryDays || 7,
    });

    return NextResponse.json(
      { success: true, rule: serializeRule(newRule.toObject()) },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      id,
      vehicleId,
      maxWeight,
      maxDimensions,
      allowedCategories,
      minDeliveryDays,
      maxDeliveryDays,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updatedRule = await VehicleRule.findByIdAndUpdate(
      id,
      {
        vehicleId,
        vehicleName: vehicle.name,
        maxWeight,
        maxDimensions,
        allowedCategories,
        minDeliveryDays,
        maxDeliveryDays,
      },
      { new: true },
    ).lean();

    if (!updatedRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, rule: serializeRule(updatedRule) },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { ruleId } = body;

    if (!ruleId) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    const deletedRule = await VehicleRule.findByIdAndDelete(ruleId).lean();
    if (!deletedRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
