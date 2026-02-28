import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Request } from "@/lib/models";

/**
 * @swagger
 * /api/company/ongoing/{id}:
 *   get:
 *     summary: Get a specific ongoing request for a company
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ongoing request details
 *       400:
 *         description: Missing companyId
 *       403:
 *         description: Unauthorized - request not assigned to this company
 *       404:
 *         description: Request not found
 *       500:
 *         description: Failed to fetch request
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 },
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 },
      );
    }

    // Find the request and verify it's assigned to this company
    const ongoingRequest = await Request.findOne({
      _id: id,
      assignedCompany: companyId,
      requestStatus: {
        $in: ["Assigned to Company", "In Transit", "Delivered", "In Progress"],
      },
    })
      .populate("user", "email fullName phone mobile")
      .lean();

    if (!ongoingRequest) {
      return NextResponse.json(
        {
          error:
            "Request not found or you don't have permission to access it",
        },
        { status: 404 },
      );
    }

    // Convert _id to id for consistency with frontend expectations
    const normalizedRequest = {
      ...ongoingRequest,
      id: ongoingRequest._id.toString(),
    };

    return NextResponse.json({ request: normalizedRequest }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
