import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { AuditLog } from "@/lib/models";

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get all audit logs
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *     responses:
 *       200:
 *         description: List of audit logs
 *       500:
 *         description: Failed to fetch audit logs
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicleId,
      maxWeight,
      maxDimensions,
      allowedCategories,
      minDeliveryDays,
      maxDeliveryDays,
    } = body;

    ensureRulesFile();
    const data = JSON.parse(fs.readFileSync(rulesFilePath, "utf-8"));

    // Get vehicle name from the main vehicles file
    const vehiclesPath = path.join(process.cwd(), "data", "vehicles.json");
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));
    const vehicle = vehiclesData.vehicles.find((v: any) => v.id === vehicleId);
    const vehicleName = vehicle?.name || "Unknown Vehicle";

    const newRule: VehicleRule = {
      id: `RULE-${Date.now()}`,
      vehicleId,
      vehicleName,
      maxWeight,
      maxDimensions,
      allowedCategories,
      minDeliveryDays,
      maxDeliveryDays,
      createdAt: new Date().toISOString(),
    };

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
