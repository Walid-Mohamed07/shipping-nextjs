import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with their locations
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all users with locations
 *       500:
 *         description: Failed to fetch users
 *   post:
 *     summary: Create a new user
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, username]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               role:
 *                 type: string
 *                 enum: [client, admin, driver, operator, company]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to create user
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const users = await User.find({})
      .select("fullName email username status role locations createdAt")
      .lean();

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { fullName, email, username, status, role } = body;

    if (!fullName || !email || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    const newUser = await User.create({
      fullName,
      email,
      username,
      password: "tempPassword123", // Should be hashed in production
      status: status || "active",
      role: role || "client",
      locations: [],
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
