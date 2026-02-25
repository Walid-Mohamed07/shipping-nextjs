import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/company/ongoing:
 *   get:
 *     summary: Get ongoing requests for a company
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: companyId\n *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ongoing requests
 *       400:
 *         description: Missing companyId
 *       500:
 *         description: Failed to fetch ongoing requests
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 },
      );
    }

    // Find ongoing requests assigned to this company
    const ongoingRequests = await Request.find({
      assignedCompanyId: companyId,
      requestStatus: {
        $in: ["Assigned to Company", "In Transit", "Delivered"],
      },
    })
      .populate("user", "email fullName profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests: ongoingRequests }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
