import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: User registration
 *     description: Create a new user account
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
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               country:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               mobile:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, password, name } = body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    const newUser = await User.create({
      email,
      password,
      name,
      fullName: name,
      username: email.split("@")[0] + Date.now(),
      role: "client",
      locations: [
        {
          country: body.country || "",
          countryCode: body.countryCode || "",
          street: body.address || "",
          city: "",
          postalCode: body.postalCode || "",
          landmark: "",
          addressType: "Home",
          primary: true,
          mobile: body.mobile || "",
        },
      ],
    });

    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        locations: newUser.locations,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          locations: newUser.locations,
          role: newUser.role,
        },
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
