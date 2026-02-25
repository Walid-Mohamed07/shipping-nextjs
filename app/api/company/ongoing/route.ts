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

    // Find ongoing requests assigned to this company user
    // Note: assignedCompany is stored as the company user's ID (string)
    console.log("[Ongoing API] Querying for companyId:", companyId);
    
    const ongoingRequests = await Request.find({
      assignedCompany: companyId,
      requestStatus: {
        $in: ["Assigned to Company", "In Transit", "Delivered", "In Progress"],
      },
    })
      .populate("user", "email fullName profilePicture mobile")
      .sort({ createdAt: -1 })
      .lean();

    console.log("[Ongoing API] Found requests:", ongoingRequests.length);

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
