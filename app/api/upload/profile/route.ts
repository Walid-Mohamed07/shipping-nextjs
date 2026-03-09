import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Validate token exists
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[PROFILE UPLOAD] Missing BLOB_READ_WRITE_TOKEN environment variable");
    return NextResponse.json(
      { error: "Upload service not configured" },
      { status: 500 },
    );
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "users";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${folder}-${timestamp}-${randomStr}.${extension}`;
    const blobPath = `${folder}/${filename}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      addRandomSuffix: false,
    });

    console.log(`[PROFILE UPLOAD] Successfully uploaded: ${filename}`);
    return NextResponse.json({ url: blob.url, filename }, { status: 200 });
  } catch (error) {
    console.error("[PROFILE UPLOAD] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload profile picture" },
      { status: 500 },
    );
  }
}
