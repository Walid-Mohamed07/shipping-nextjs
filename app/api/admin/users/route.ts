import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";
import bcryptjs from "bcryptjs";

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
 *             required: [fullName, email, username, password]
 *             properties:
 *               fullName:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               mobile:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               role:
 *                 type: string
 *                 enum: [client, admin, driver, operator, company, warehouse_manager]
 *               locations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields or user exists
 *       500:
 *         description: Failed to create user
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const users = await User.find({})
      .select(
        "fullName email username status role profilePicture birthDate mobile createdAt company",
      )
      .populate("company", "name email phoneNumber address rate")
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
    const {
      fullName,
      email,
      username,
      password,
      mobile,
      birthDate,
      profilePicture,
      status,
      role,
      company,
    } = body;

    if (!fullName || !email || !username) {
      return NextResponse.json(
        {
          error: "Missing required fields: fullName, email, username",
        },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error: "Password is required",
        },
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

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { error: "User with this username already exists" },
        { status: 400 },
      );
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await User.create({
      fullName,
      name: fullName,
      email,
      username,
      password: hashedPassword,
      profilePicture: profilePicture || "",
      birthDate: birthDate || null,
      mobile: mobile || "",
      status: status || "active",
      role: role || "client",
      company: company || undefined,
    });

    // Populate company data before returning
    await newUser.populate("company", "name email phoneNumber address rate");

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          username: newUser.username,
          mobile: newUser.mobile,
          profilePicture: newUser.profilePicture,
          role: newUser.role,
          status: newUser.status,
          birthDate: newUser.birthDate,
          createdAt: newUser.createdAt,
          company: newUser.company,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, fullName, email, username, mobile, birthDate, profilePicture, status, role, company, newPassword } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 },
      );
    }

    if (!fullName || !email || !username) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, email, username" },
        { status: 400 },
      );
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Check if email is being changed and already exists
    if (email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 },
        );
      }
    }

    // Check if username is being changed and already exists
    if (username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return NextResponse.json(
          { error: "Username already in use" },
          { status: 400 },
        );
      }
    }

    // Prepare update object
    const updateData: any = {
      fullName,
      name: fullName,
      email,
      username,
      mobile: mobile || "",
      birthDate: birthDate || null,
      profilePicture: profilePicture || "",
      status: status || "active",
      role: role || "client",
      company: company || undefined,
    };

    // If new password is provided, hash it
    if (newPassword) {
      const hashedPassword = await bcryptjs.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: "after" },
    ).populate("company", "name email phoneNumber address rate");

    return NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          username: updatedUser.username,
          mobile: updatedUser.mobile,
          profilePicture: updatedUser.profilePicture,
          role: updatedUser.role,
          status: updatedUser.status,
          birthDate: updatedUser.birthDate,
          createdAt: updatedUser.createdAt,
          company: updatedUser.company,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
