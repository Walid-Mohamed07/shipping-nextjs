import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    // Extract userId from authenticated JWT token
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = currentUser.id;
    const body = await req.json();
    const {
      name,
      email,
      mobile,
      birthDate,
      profilePicture,
      currentPassword,
      newPassword,
      country,
      preferredCurrency,
    } = body;

    // Get user for password verification
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    // Email cannot be changed - skip email updates
    // if (email !== undefined) updateData.email = email;

    // If mobile number changed, reset mobileVerified to false
    if (mobile !== undefined && mobile !== user.mobile) {
      updateData.mobile = mobile;
      updateData.mobileVerified = false;
      updateData.mobileOTP = { code: null, expiresAt: null };
    } else if (mobile !== undefined) {
      updateData.mobile = mobile;
    }

    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (profilePicture !== undefined)
      updateData.profilePicture = profilePicture;
    if (country !== undefined) updateData.country = country;
    if (preferredCurrency !== undefined)
      updateData.preferredCurrency = preferredCurrency;

    // Handle password change if provided
    if (currentPassword && newPassword) {
      // Verify current password
      const isPasswordValid = await bcryptjs.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 },
        );
      }

      // Hash new password
      const hashedPassword = await bcryptjs.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

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
        emailVerified: updatedUser.emailVerified,
        mobileVerified: updatedUser.mobileVerified,
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
        emailVerified: updatedUser.emailVerified,
        mobileVerified: updatedUser.mobileVerified,
        country: updatedUser.country,
        preferredCurrency: updatedUser.preferredCurrency,
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

    // Extract userId from authenticated JWT token
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = currentUser.id;

    const user = await User.findById(userId).lean();
    9;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
