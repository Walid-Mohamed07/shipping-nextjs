import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check if BLOB token is configured
    const tokenConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!tokenConfigured) {
      return NextResponse.json({
        status: "error",
        message: "BLOB_READ_WRITE_TOKEN not configured",
        configured: false,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      message: "Vercel Blob storage is configured and ready",
      configured: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BLOB TEST] Error:", error);
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
