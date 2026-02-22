import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, name, email, mobile, birthDate, profilePicture } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (profilePicture !== undefined)
      updateData.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate new JWT token with updated user data
    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const newToken = jwt.sign(
      {
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        mobile: updatedUser.mobile,
        name: updatedUser.name,
        fullName: updatedUser.fullName,
        birthDate: updatedUser.birthDate,
        profilePicture: updatedUser.profilePicture,
        company: updatedUser.company || null,
        role: updatedUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        mobile: updatedUser.mobile,
        birthDate: updatedUser.birthDate,
        profilePicture: updatedUser.profilePicture,
        company: updatedUser.company || null,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });

    // Set HTTP-only cookie with new token
    response.cookies.set({
      name: "auth_token",
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
