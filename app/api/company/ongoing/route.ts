import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Company Ongoing Requests API
 * 
 * Fetch ongoing requests for a specific company.
 * These are requests where:
 * - assignedCompanyId matches the company
 * - requestStatus is "Assigned to Company"
 */

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

    // Also get the company info to match by userId or id
    const companiesPath = path.join(process.cwd(), "data", "companies.json");
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
