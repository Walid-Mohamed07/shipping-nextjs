import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, password } = body;

    console.log("Login: User attempting to login with email:", email);

    const user = await User.findOne({ email });

    if (!user) {
      console.log("Login: User not found for email:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Compare hashed password
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Login: Invalid password for email:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    console.log("Login: User authenticated:", email);

    const primaryLocation = Array.isArray(user.locations)
      ? user.locations.find((loc: any) => loc.primary) || user.locations[0]
      : {};

    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        company: user.company || null,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    console.log("Login: Token generated for user:", email);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id,
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          fullName: user.fullName,
          username: user.username,
          mobile: user.mobile,
          birthDate: user.birthDate,
          profilePicture: user.profilePicture,
          company: user.company || null,
          role: user.role,
          status: user.status,
        },
        token,
      },
      { status: 200 },
    );

    // Set HTTP-only cookie with token
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    console.log("Login: HTTP-only cookie set for user:", email);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
