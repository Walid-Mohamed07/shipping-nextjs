import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { CostCriteria } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * @swagger
 * /api/admin/cost-criteria/history:
 *   get:
 *     summary: Get cost criteria version history
 *     tags: [Admin Cost Criteria]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *         description: Max number of records to return (default 10)
 *     responses:
 *       200:
 *         description: List of cost criteria versions
 *       500:
 *         description: Failed to fetch history
 */

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const history = await CostCriteria.find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
