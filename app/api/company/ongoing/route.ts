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
        { status: 400 }
      );
    }

    // Find ongoing requests assigned to this company
    const ongoingRequests = await Request.find({
      assignedCompanyId: companyId,
      requestStatus: { $in: ["Assigned to Company", "In Transit", "Delivered"] }
    })
      .populate("userId", "email fullName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests: ongoingRequests }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
    const companiesData = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));
    
    const company = companiesData.companies.find(
      (c: any) => c.id === companyId || c.userId === companyId
    );

    // Filter requests assigned to this company
    const assignedRequests = requestsData.requests.filter((req: any) => {
      // Check if assigned to this company (by company ID or user ID)
      if (req.assignedCompanyId === companyId) return true;
      if (company && req.assignedCompanyId === company.id) return true;
      
      // Also check if the request status is "Assigned to Company" and 
      // the selected company ID matches
      if (req.requestStatus === "Assigned to Company") {
        const acceptedOffer = req.costOffers?.find((o: any) => o.status === "accepted");
        if (acceptedOffer) {
          if (acceptedOffer.company?.id === companyId) return true;
          if (company && acceptedOffer.company?.id === company.id) return true;
        }
      }
      
      return false;
    });

    return NextResponse.json({ requests: assignedRequests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching assigned requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch assigned requests" },
      { status: 500 }
    );
  }
}
