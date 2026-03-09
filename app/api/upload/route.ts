import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Validate token exists
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[UPLOAD] Missing BLOB_READ_WRITE_TOKEN environment variable");
    return NextResponse.json(
      { error: "Upload service not configured" },
      { status: 500 },
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
    const blobPath = `${folder}/${filename}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log(`[UPLOAD] File uploaded: ${filename}`);
    return NextResponse.json({
      url: blob.url,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
