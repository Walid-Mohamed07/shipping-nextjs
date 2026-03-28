import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Validate token exists
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("Missing BLOB_READ_WRITE_TOKEN environment variable");
      return NextResponse.json(
        { error: "Upload service not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    console.log("[MEDIA UPLOAD] Files received:", files.length);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate file count
    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 files per upload" },
        { status: 400 },
      );
    }

    const uploadedUrls: string[] = [];
    const failedUploads: string[] = [];

    // Process each file
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        failedUploads.push(`${file.name}: Not an image`);
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        failedUploads.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      try {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split(".").pop() || "jpg";
        const filename = `items/item-${timestamp}-${randomStr}.${extension}`;

        // Upload to Vercel Blob
        const blob = await put(filename, file, {
          access: "private",
          addRandomSuffix: false,
        });

        const proxyUrl = `/api/upload/serve?url=${encodeURIComponent(blob.url)}`;
        uploadedUrls.push(proxyUrl);
      } catch (fileError) {
        console.error(
          `[MEDIA UPLOAD] Error uploading ${file.name}:`,
          fileError,
        );
        failedUploads.push(`${file.name}: ${String(fileError)}`);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: "No files could be uploaded", details: failedUploads },
        { status: 400 },
      );
    }

    console.log(
      `[MEDIA UPLOAD] Success: ${uploadedUrls.length} uploaded, ${failedUploads.length} failed`,
    );
    return NextResponse.json(
      {
        urls: uploadedUrls,
        failed: failedUploads.length > 0 ? failedUploads : undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[MEDIA UPLOAD] Fatal error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload media",
      },
      { status: 500 },
    );
  }
}
