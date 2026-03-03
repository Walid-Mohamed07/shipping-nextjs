import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public/assets/images/companies");
const PUBLIC_PATH = "/assets/images/companies";

// Ensure the upload directory exists
function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadCompanyLogo(
  file: File,
): Promise<string | undefined> {
  try {
    if (!file) return undefined;

    ensureUploadDir();

    const buffer = await file.arrayBuffer();
    const filename = `${Date.now()}-${file.name}`;
    const filepath = join(UPLOAD_DIR, filename);

    await writeFile(filepath, Buffer.from(buffer));

    // Return relative path that can be served from public/
    return `${PUBLIC_PATH}/${filename}`;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload logo");
  }
}

export async function deleteCompanyLogo(logoPath: string): Promise<void> {
  try {
    if (!logoPath) return;

    // Extract filename from path
    const filename = logoPath.split("/").pop();
    if (!filename) return;

    const filepath = join(UPLOAD_DIR, filename);

    // Check if file exists before attempting to delete
    if (existsSync(filepath)) {
      await unlink(filepath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    // Don't throw error for file deletion, just log it
  }
}
