import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
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

    // Ensure upload directory exists
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "assets",
      "images",
      folder,
    );

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.name) || ".jpg";
    const filename = `${folder}-${timestamp}-${randomStr}${extension}`;
    const filepath = path.join(uploadDir, filename);

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Save file
    await writeFile(filepath, new Uint8Array(buffer));

    // Return relative URL path
    const url = `/assets/images/${folder}/${filename}`;

    return NextResponse.json({ url, filename }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture" },
      { status: 500 },
    );
  }
}
