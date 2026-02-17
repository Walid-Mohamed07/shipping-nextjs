import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User, Address } from "@/lib/models";

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: User registration
 *     description: Create a new user account with address and profile picture
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName, mobile, profilePicture]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               username:
 *                 type: string
 *               mobile:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists or invalid input
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      username,
      mobile,
      profilePicture,
      birthDate,
      address,
    } = body;

    if (!email || !password || !fullName || !mobile || !profilePicture) {
      return NextResponse.json(
        {
          error:
            "Email, password, fullName, mobile, and profilePicture are required",
        },
        { status: 400 },
      );
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    // Create user
    const newUser = await User.create({
      email,
      password,
      fullName,
      name: fullName,
      username: username || email.split("@")[0] + Date.now(),
      mobile,
      profilePicture,
      birthDate: birthDate || null,
      role: "client",
      status: "active",
      locations: [],
    });

    // If address is provided, create address document(s)
    let createdAddress = null;
    if (address && address.country) {
      createdAddress = await Address.create({
        userId: newUser._id,
        country: address.country || "",
        countryCode: address.countryCode || "",
        fullName: address.fullName || fullName,
        mobile: address.mobile || mobile,
        street: address.street || "",
        building: address.building || "",
        city: address.city || "",
        district: address.district || "",
        governorate: address.governorate || "",
        postalCode: address.postalCode || "",
        landmark: address.landmark || "",
        addressType: address.addressType || "Home",
        deliveryInstructions: address.deliveryInstructions || "",
        primary: true,
        coordinates: address.coordinates || null,
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        mobile: newUser.mobile,
        birthDate: newUser.birthDate,
        profilePicture: newUser.profilePicture,
        role: newUser.role,
        status: newUser.status,
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
          username: newUser.username,
          mobile: newUser.mobile,
          birthDate: newUser.birthDate,
          profilePicture: newUser.profilePicture,
          role: newUser.role,
          status: newUser.status,
        },
        address: createdAddress,
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
