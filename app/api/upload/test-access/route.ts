import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  try {
    console.log("=== FILE ACCESS TEST START ===");
    
    const cwd = process.cwd();
    console.log("Current working directory:", cwd);
    
    const uploadDir = path.join(cwd, "public", "assets", "images", "items");
    console.log("Expected upload directory:", uploadDir);
    
    // Check if directory exists
    const dirExists = fs.existsSync(uploadDir);
    console.log("Directory exists:", dirExists);
    
    let dirStats = null;
    let dirReadable = false;
    let files: string[] = [];
    
    if (dirExists) {
      try {
        dirStats = fs.statSync(uploadDir);
        console.log("Directory stats:", {
          mode: dirStats.mode.toString(8),
          isDirectory: dirStats.isDirectory(),
          size: dirStats.size,
        });
        
        // Try to read directory
        try {
          files = fs.readdirSync(uploadDir);
          dirReadable = true;
          console.log(`Directory readable. Contains ${files.length} files`);
          console.log("Sample files:", files.slice(0, 5));
        } catch (readErr) {
          console.error("Error reading directory:", readErr);
        }
      } catch (statsErr) {
        console.error("Error getting directory stats:", statsErr);
      }
    }
    
    // Test write capability
    let canWrite = false;
    const testFile = path.join(uploadDir, ".write-test");
    
    try {
      // Create directory if needed
      if (!dirExists) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log("Directory created successfully");
      }
      
      // Try to write test file
      fs.writeFileSync(testFile, "test");
      console.log("Test file written successfully");
      
      // Check if file exists
      if (fs.existsSync(testFile)) {
        console.log("Test file exists after write");
        canWrite = true;
        
        // Clean up test file
        fs.unlinkSync(testFile);
        console.log("Test file deleted");
      } else {
        console.warn("Test file does not exist after write");
      }
    } catch (writeErr) {
      console.error("Error testing write capability:", writeErr);
    }
    
    console.log("=== FILE ACCESS TEST END ===");
    
    return NextResponse.json({
      cwd,
      uploadDir,
      dirExists,
      dirReadable,
      canWrite,
      fileCount: files.length,
      sampleFiles: files.slice(0, 10),
      dirStats: dirStats ? {
        mode: dirStats.mode.toString(8),
        isDirectory: dirStats.isDirectory(),
        size: dirStats.size,
      } : null,
    });
  } catch (error) {
    console.error("File access test error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
