import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  try {
    const cwd = process.cwd();
    const uploadDir = path.join(cwd, "public", "assets", "images", "items");
    
    console.log("[FILE LIST] Upload directory:", uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
      return NextResponse.json({
        error: "Upload directory does not exist",
        uploadDir,
      }, { status: 404 });
    }
    
    const files = fs.readdirSync(uploadDir);
    console.log("[FILE LIST] Found files:", files.length);
    
    const fileDetails = files
      .filter(f => f !== '.gitkeep')
      .reverse()
      .slice(0, 20)
      .map((filename) => {
        const filepath = path.join(uploadDir, filename);
        const stats = fs.statSync(filepath);
        const url = `/assets/images/items/${filename}`;
        
        return {
          filename,
          size: stats.size,
          modified: stats.mtime,
          url,
          accessibleAt: url,
        };
      });
    
    console.log("[FILE LIST] Returning details for", fileDetails.length, "files");
    
    return NextResponse.json({
      uploadDir,
      totalFiles: files.length,
      recentFiles: fileDetails,
    });
  } catch (error) {
    console.error("[FILE LIST] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
