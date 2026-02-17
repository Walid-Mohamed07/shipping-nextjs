import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { VehicleRule, Vehicle } from "@/lib/models";

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
    const rules = await VehicleRule.find({})
      .populate("vehicleId", "type plateNumber")
      .lean();
    return NextResponse.json({ rules }, { status: 200 });
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

    // Verify vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const newRule = await VehicleRule.create({
      vehicleId,
      maxWeight,
      maxDimensions: maxDimensions || "N/A",
      allowedCategories: allowedCategories || [],
      minDeliveryDays: minDeliveryDays || 1,
      maxDeliveryDays: maxDeliveryDays || 7,
    });
    data.rules.push(newRule);
    fs.writeFileSync(rulesFilePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, rule: newRule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
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

    ensureRulesFile();
    const data = JSON.parse(fs.readFileSync(rulesFilePath, "utf-8"));

    const ruleIndex = data.rules.findIndex((r: VehicleRule) => r.id === id);
    if (ruleIndex === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Get vehicle name
    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));
    const vehicle = vehiclesData.vehicles.find((v: any) => v.id === vehicleId);
    const vehicleName = vehicle?.name || "Unknown Vehicle";

    data.rules[ruleIndex] = {
      ...data.rules[ruleIndex],
      vehicleId,
      vehicleName,
      maxWeight,
      maxDimensions,
      allowedCategories,
      minDeliveryDays,
      maxDeliveryDays,
    };

    fs.writeFileSync(rulesFilePath, JSON.stringify(data, null, 2));

    return NextResponse.json(
      { success: true, rule: data.rules[ruleIndex] },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId } = body;

    ensureRulesFile();
    const data = JSON.parse(fs.readFileSync(rulesFilePath, "utf-8"));

    const ruleIndex = data.rules.findIndex((r: VehicleRule) => r.id === ruleId);
    if (ruleIndex === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    data.rules.splice(ruleIndex, 1);
    fs.writeFileSync(rulesFilePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 },
    );
  }
}
