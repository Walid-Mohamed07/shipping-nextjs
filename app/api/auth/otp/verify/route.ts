import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";

/**
 * @swagger
 * /api/auth/otp/verify:
 *   post:
 *     summary: Verify OTP for email or mobile
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, otp, userId]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, mobile]
 *               otp:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { type, otp, userId } = body;

    if (!type || !otp || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: type, otp, userId" },
        { status: 400 },
      );
    }

    if (!["email", "mobile"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'email' or 'mobile'" },
        { status: 400 },
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Get the stored OTP
    const storedOTP = type === "email" ? user.emailOTP : user.mobileOTP;

    if (!storedOTP || !storedOTP.code) {
      return NextResponse.json(
        { error: "No OTP found. Please request a new OTP." },
        { status: 400 },
      );
    }

    // Check if OTP is expired
    if (new Date() > new Date(storedOTP.expiresAt)) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Verify OTP
    if (storedOTP.code !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please try again." },
        { status: 400 },
      );
    }

    // Mark as verified and clear OTP
    if (type === "email") {
      user.emailVerified = true;
      user.emailOTP = undefined;
    } else {
      user.mobileVerified = true;
      user.mobileOTP = undefined;
    }
    await user.save();

    // Generate new JWT token with updated verification status
    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const newToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username,
        mobile: user.mobile,
        name: user.name,
        fullName: user.fullName,
        birthDate: user.birthDate,
        profilePicture: user.profilePicture,
        driver: user.driver || null,
        role: user.role,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json({
      success: true,
      message: `${type === "email" ? "Email" : "Mobile"} verified successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        username: user.username,
        mobile: user.mobile,
        birthDate: user.birthDate,
        profilePicture: user.profilePicture,
        driver: user.driver || null,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
      },
    });

    // Set HTTP-only cookie with new token
    response.cookies.set({
      name: "auth_token",
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return handleError(error);
  }
}
