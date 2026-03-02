import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { CostCriteria } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * @swagger
 * /api/admin/cost-criteria:
 *   get:
 *     summary: Get active cost criteria
 *     tags: [Admin Cost Criteria]
 *     responses:
 *       200:
 *         description: Current cost criteria
 *       500:
 *         description: Failed to fetch cost criteria
 *   post:
 *     summary: Create or update cost criteria (admin only)
 *     tags: [Admin Cost Criteria]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryRates:
 *                 type: array
 *               weightMultiplier:
 *                 type: number
 *               quantityMultiplier:
 *                 type: number
 *               sameLocationMultiplier:
 *                 type: number
 *               differentLocationMultiplier:
 *                 type: number
 *               urgentDeliverySurcharge:
 *                 type: number
 *               minPrice:
 *                 type: number
 *               maxPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Cost criteria created/updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Failed to save cost criteria
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const costCriteria = await CostCriteria.findOne({ isActive: true }).lean();

    // Return default criteria if none exists
    if (!costCriteria) {
      return NextResponse.json(
        {
          costCriteria: {
            categoryRates: [],
            weightMultiplier: 1,
            quantityMultiplier: 1,
            sameLocationMultiplier: 1,
            differentLocationMultiplier: 1.5,
            urgentDeliverySurcharge: 1.25,
            minPrice: 0,
            maxPrice: null,
            isActive: true,
            version: 0,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ costCriteria }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Check admin authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const {
      categoryRates,
      weightMultiplier,
      quantityMultiplier,
      sameLocationMultiplier,
      differentLocationMultiplier,
      urgentDeliverySurcharge,
      minPrice,
      maxPrice,
    } = await request.json();

    // Validate required fields
    if (!categoryRates || !Array.isArray(categoryRates)) {
      return NextResponse.json(
        { error: "categoryRates must be an array" },
        { status: 400 },
      );
    }

    // Get the current active criteria to increment version
    const currentCriteria = await CostCriteria.findOne({ isActive: true });
    const newVersion = (currentCriteria?.version || 0) + 1;

    // Deactivate old criteria
    if (currentCriteria) {
      currentCriteria.isActive = false;
      await currentCriteria.save();
    }

    // Create new criteria
    const costCriteria = new CostCriteria({
      categoryRates,
      weightMultiplier: weightMultiplier || 1,
      quantityMultiplier: quantityMultiplier || 1,
      sameLocationMultiplier: sameLocationMultiplier || 1,
      differentLocationMultiplier: differentLocationMultiplier || 1.5,
      urgentDeliverySurcharge: urgentDeliverySurcharge || 1.25,
      minPrice: minPrice || 0,
      maxPrice: maxPrice || null,
      isActive: true,
      version: newVersion,
    });

    await costCriteria.save();

    return NextResponse.json(
      { costCriteria, message: "Cost criteria updated successfully" },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
