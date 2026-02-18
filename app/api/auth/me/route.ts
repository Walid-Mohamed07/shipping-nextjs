import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user from HTTP-only cookie
 *     description: Returns the user data from the HTTP-only auth token
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *       401:
 *         description: No valid token found
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from HTTP-only cookie
    // Try both methods for compatibility
    const cookieStore = await cookies();
    const token =
      cookieStore.get("auth_token")?.value ||
      request.cookies.get("auth_token")?.value;

    console.log("Auth /me: Received request");
    console.log("Auth /me: Token from cookie:", token ? "exists" : "NOT FOUND");

    if (!token) {
      console.log("Auth /me: No token found in cookie");
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    console.log(
      "Auth /me: Token verified successfully for user:",
      decoded.email,
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          fullName: decoded.fullName,
          username: decoded.username,
          mobile: decoded.mobile,
          birthDate: decoded.birthDate,
          profilePicture: decoded.profilePicture,
          company: decoded.company,
          role: decoded.role,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Auth /me: Token verification failed:", error);
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }
}
