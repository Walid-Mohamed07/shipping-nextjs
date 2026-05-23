import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Validate token exists
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[FILE LIST] Missing BLOB_READ_WRITE_TOKEN");
      return NextResponse.json({
        error: "Upload service not configured",
      }, { status: 500 });
    }

    // Get prefix from query params (e.g., "items/" to list item images)
    const prefix = request.nextUrl.searchParams.get("prefix") || "items/";
    
    console.log("[FILE LIST] Listing files with prefix:", prefix);

    // List files from Vercel Blob
    const { blobs } = await list({
      prefix: prefix,
      limit: 100,
    });

    console.log("[FILE LIST] Found", blobs.length, "files");

    const fileDetails = blobs
      .slice(0, 20)
      .map((blob) => ({
        filename: blob.pathname.split("/").pop(),
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        pathname: blob.pathname,
      }));

    return NextResponse.json({
      prefix,
      totalFiles: blobs.length,
      recentFiles: fileDetails,
    });
  } catch (error) {
    console.error("[FILE LIST] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
