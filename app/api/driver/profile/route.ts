import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Driver, User } from "@/lib/models";

/**\n * @swagger
 * /api/driver/profile:
 *   get:
 *     summary: Get driver profile by userId
 *     tags: [Driver]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver profile details
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Failed to fetch profile
 *   put:
 *     summary: Update driver profile
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       500:
 *         description: Failed to update profile
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Find user and get their associated driver
    const user = await User.findById(userId).populate("driver");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.driver) {
      return NextResponse.json(
        { error: "No driver associated with this user" },
        { status: 404 },
      );
    }

    return NextResponse.json(user.driver, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { userId, name, phoneNumber, email, address, rate } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Find user and get their associated driver
    const user = await User.findById(userId).populate("driver");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.driver) {
      return NextResponse.json(
        { error: "No driver associated with this user" },
        { status: 404 },
      );
    }

    // Update the driver details
    const driver = await Driver.findByIdAndUpdate(
      user.driver._id || user.driver.id,
      {
        name: name || user.driver.name,
        phoneNumber: phoneNumber || user.driver.phoneNumber,
        email: email || user.driver.email,
        address: address || user.driver.address,
        rate: rate || user.driver.rate,
        updatedAt: new Date(),
      },
      { returnDocument: "after" },
    ).lean();

    return NextResponse.json(driver, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
