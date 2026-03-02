import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

export async function POST(request: NextRequest) {
  try {
    console.log("=== UPLOAD START ===");
    console.log("Current working directory:", process.cwd());

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    console.log("Files received:", files.length);
    if (files && files.length > 0) {
      files.forEach((f, i) => {
        console.log(`File ${i}:`, f.name, "Type:", f.type, "Size:", f.size);
      });
    }

    if (!files || files.length === 0) {
      console.warn("No files provided");
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

    console.log("Upload directory:", uploadDir);

    try {
      await mkdir(uploadDir, { recursive: true });
      console.log("Directory created/verified successfully");

      // Verify directory exists and is writable
      if (fs.existsSync(uploadDir)) {
        console.log("Directory exists:", true);
        const stats = fs.statSync(uploadDir);
        console.log("Directory permissions:", stats.mode);
      } else {
        console.warn("Directory does NOT exist after mkdir call");
      }
    } catch (error) {
      console.error("Error creating directory:", error);
      throw error;
    }

    const uploadedUrls: string[] = [];

    // Process each file
    for (const file of files) {
      console.log(`\nProcessing file: ${file.name}`);

      if (!file.type.startsWith("image/")) {
        console.log(`Skipping non-image file: ${file.type}`);
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        console.log(`Buffer received: ${buffer.byteLength} bytes`);

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = path.extname(file.name) || ".jpg";
        const filename = `item-${timestamp}-${randomStr}${extension}`;
        const filepath = path.join(uploadDir, filename);

        console.log(`Writing to: ${filepath}`);

        // Save file
        const bufferToWrite = Buffer.from(buffer);
        console.log(`Buffer size for write: ${bufferToWrite.length} bytes`);

        await writeFile(filepath, bufferToWrite);
        console.log(`File written successfully`);

        // Verify file exists
        if (fs.existsSync(filepath)) {
          const fileStats = fs.statSync(filepath);
          console.log(
            `File verified: exists=${true}, size=${fileStats.size} bytes`,
          );
        } else {
          console.error(`File NOT found after write: ${filepath}`);
        }

        // Return relative URL path
        const url = `/assets/images/items/${filename}`;
        uploadedUrls.push(url);
        console.log(`URL added: ${url}`);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        throw fileError;
      }
    }

    console.log("=== UPLOAD SUCCESS ===");
    console.log("Total URLs returned:", uploadedUrls.length);
    return NextResponse.json(
      { urls: uploadedUrls },
      { status: 200 },
    );
  } catch (error) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Full error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload media",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
