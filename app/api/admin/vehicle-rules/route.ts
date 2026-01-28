import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface VehicleRule {
  id: string;
  vehicleId: string;
  vehicleName: string;
  maxWeight: number;
  maxDimensions: string;
  allowedCategories: string[];
  minDeliveryDays: number;
  maxDeliveryDays: number;
  createdAt: string;
}

const rulesFilePath = path.join(process.cwd(), "data", "vehicle-rules.json");

const ensureRulesFile = () => {
  if (!fs.existsSync(rulesFilePath)) {
    fs.writeFileSync(rulesFilePath, JSON.stringify({ rules: [] }, null, 2));
  }
};

export async function GET() {
  try {
    ensureRulesFile();
    const data = JSON.parse(fs.readFileSync(rulesFilePath, "utf-8"));
    return NextResponse.json({ rules: data.rules || [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 },
    );
  }
}

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
