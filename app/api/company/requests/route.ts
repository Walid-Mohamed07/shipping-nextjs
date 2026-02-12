import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Company Requests API
 * 
 * Visibility Rules:
 * - Companies can only see requests that are:
 *   - Created by clients
 *   - Approved/accepted by admin OR operator
 * - Companies must NOT see:
 *   - Pending requests
 *   - Rejected requests
 *   - Requests already accepted by another company (assigned)
 *   - Requests they have rejected
 */

// GET - Fetch requests visible to this company
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    // Filter requests based on visibility rules
    const visibleRequests = requestsData.requests.filter((req: any) => {
      // Rule 1: Only show "Accepted" or "Action needed" status requests
      // (These are approved by admin/operator)
      const validStatuses = ["Accepted", "Action needed"];
      if (!validStatuses.includes(req.requestStatus)) {
        return false;
      }

      // Rule 2: Don't show requests already assigned to another company
      if (req.assignedCompanyId && req.assignedCompanyId !== companyId) {
        return false;
      }

      // Rule 3: Don't show if this company already rejected it
      if (req.rejectedByCompanies && req.rejectedByCompanies.includes(companyId)) {
        return false;
      }

      // Rule 4: Don't show if the request status is "Assigned to Company" 
      // and it's assigned to a different company
      if (req.requestStatus === "Assigned to Company" && req.assignedCompanyId !== companyId) {
        return false;
      }

      // Rule 5: Show requests that are either:
      // - Not assigned yet (open for offers)
      // - Or the company has already submitted an offer that's still pending
      const hasMyPendingOffer = req.costOffers?.some(
        (offer: any) => 
          offer.company?.id === companyId && 
          offer.status !== "rejected"
      );

      // If already assigned to another company (even with my offer), don't show
      if (req.assignedCompanyId && req.assignedCompanyId !== companyId) {
        return false;
      }

      return true;
    });

    return NextResponse.json({ requests: visibleRequests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching company requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST - Handle company actions (add-offer, reject-request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, requestId, companyId, company, offer } = body;

    if (!action || !requestId || !companyId) {
      return NextResponse.json(
        { error: "action, requestId, and companyId are required" },
        { status: 400 }
      );
    }

    const requestsPath = path.join(process.cwd(), "data", "requests.json");
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, "utf-8"));

    const requestIndex = requestsData.requests.findIndex(
      (r: any) => r.id === requestId
    );

    if (requestIndex === -1) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const currentRequest = requestsData.requests[requestIndex];
    const now = new Date().toISOString();

    // Verify request is still available for this company
    if (currentRequest.assignedCompanyId && currentRequest.assignedCompanyId !== companyId) {
      return NextResponse.json(
        { error: "This request has already been assigned to another company" },
        { status: 400 }
      );
    }

    if (action === "add-offer") {
      // Validate offer data
      if (!offer || typeof offer.cost !== "number" || offer.cost <= 0) {
        return NextResponse.json(
          { error: "Valid cost amount is required" },
          { status: 400 }
        );
      }

      // Check if company already has an offer on this request
      const existingOfferIndex = currentRequest.costOffers?.findIndex(
        (o: any) => o.company?.id === companyId
      );

      const newOffer = {
        cost: offer.cost,
        comment: offer.comment || "",
        company: {
          id: company?.id || companyId,
          name: company?.name || "Unknown Company",
          phoneNumber: company?.phoneNumber || "",
          email: company?.email || "",
          address: company?.address || "",
          rate: company?.rate || "N/A",
        },
        selected: false,
        status: "pending" as const,
        createdAt: now,
      };

      if (!currentRequest.costOffers) {
        currentRequest.costOffers = [];
      }

      if (existingOfferIndex !== undefined && existingOfferIndex >= 0) {
        // Update existing offer
        currentRequest.costOffers[existingOfferIndex] = newOffer;
      } else {
        // Add new offer
        currentRequest.costOffers.push(newOffer);
      }

      // Update request status to indicate offers are available
      if (currentRequest.requestStatus === "Accepted") {
        currentRequest.requestStatus = "Action needed";
      }

      // Add to activity history
      if (!currentRequest.activityHistory) {
        currentRequest.activityHistory = [];
      }
      currentRequest.activityHistory.push({
        timestamp: now,
        action: "offer_submitted",
        description: `Company ${company?.name || companyId} submitted an offer of $${offer.cost}`,
        companyName: company?.name,
        cost: offer.cost,
      });

      currentRequest.updatedAt = now;
      fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

      return NextResponse.json(
        { success: true, message: "Offer submitted successfully" },
        { status: 200 }
      );
    }

    if (action === "reject-request") {
      // Add company to the rejected list
      if (!currentRequest.rejectedByCompanies) {
        currentRequest.rejectedByCompanies = [];
      }

      if (!currentRequest.rejectedByCompanies.includes(companyId)) {
        currentRequest.rejectedByCompanies.push(companyId);
      }

      // Add to activity history
      if (!currentRequest.activityHistory) {
        currentRequest.activityHistory = [];
      }
      currentRequest.activityHistory.push({
        timestamp: now,
        action: "company_rejected",
        description: `Company ${companyId} rejected this request`,
      });

      currentRequest.updatedAt = now;
      fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

      return NextResponse.json(
        { success: true, message: "Request rejected" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error handling company action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
