import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface AuthUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  fullName?: string;
  username?: string;
  mobile?: string;
  birthDate?: string;
  profilePicture?: string;
  company?: string;
  role?: string;
}

/**
 * Extract and verify the current user from the auth token
 * Returns null if no valid token exists
 */
export async function getCurrentUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    // 1. Try HTTP-only cookie (primary)
    const cookieToken =
      cookieStore.get("auth_token")?.value ||
      request.cookies.get("auth_token")?.value;

    // 2. Fall back to Authorization: Bearer <token> header (sent by useLiveData)
    const authHeader = request.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return null;
    }

    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return {
      id: decoded.id,
      _id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      fullName: decoded.fullName,
      username: decoded.username,
      mobile: decoded.mobile,
      birthDate: decoded.birthDate,
      profilePicture: decoded.profilePicture,
      company: decoded.company,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if the current user is authorized to access a request
 * User is authorized if:
 * 1. They own the request (userId matches), OR
 * 2. They are an admin
 *
 * @param currentUserId - The ID of the current user
 * @param currentUserRole - The role of the current user
 * @param requestUserId - The ID of the request owner
 * @returns true if authorized, false otherwise
 */
export function isUserAuthorizedForRequest(
  currentUserId: string,
  currentUserRole: string | undefined,
  requestUserId: string,
): boolean {
  // Allow if user is admin
  if (
    currentUserRole === "admin" ||
    currentUserRole === "operator" ||
    currentUserRole === "company"
  ) {
    return true;
  }

  // Allow if user owns the request
  if (currentUserId === requestUserId) {
    return true;
  }

  return false;
}
