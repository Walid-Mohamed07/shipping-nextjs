/**
 * Generates a unique public ID in the format REQ-XXXXX
 * where X are random alphanumeric characters (uppercase letters and numbers)
 * Examples: REQ-9X4K2M, REQ-A7B2Q9, REQ-M1P8K3
 */
export function generatePublicId(): string {
  const PREFIX = "REQ";
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const LENGTH = 6;

  let id = "";
  for (let i = 0; i < LENGTH; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }

  return `${PREFIX}-${id}`;
}

/**
 * Validates if a string is a valid public ID format
 * @param publicId - The public ID to validate
 * @returns true if the publicId matches the REQ-XXXXX format
 */
export function isValidPublicId(publicId: string): boolean {
  return /^REQ-[A-Z0-9]{6}$/.test(publicId);
}
