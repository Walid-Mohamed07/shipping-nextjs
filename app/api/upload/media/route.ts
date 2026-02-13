import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 },
      );
    }

    // Ensure upload directory exists
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "assets",
      "images",
      "items",
    );

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const uploadedUrls: string[] = [];

    // Process each file
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue; // Skip non-image files
      }

      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = path.extname(file.name) || ".jpg";
      const filename = `item-${timestamp}-${randomStr}${extension}`;
      const filepath = path.join(uploadDir, filename);

      // Save file
      await writeFile(filepath, Buffer.from(buffer));

      // Return relative URL path
      const url = `/assets/images/items/${filename}`;
      uploadedUrls.push(url);
    }

    return NextResponse.json(
      { urls: uploadedUrls },
      { status: 200 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload media" },
      { status: 500 },
    );
  }
}
