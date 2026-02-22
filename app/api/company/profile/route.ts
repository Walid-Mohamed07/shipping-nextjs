import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Company, User } from "@/lib/models";

/**\n * @swagger
 * /api/company/profile:
 *   get:
 *     summary: Get company profile by userId
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company profile details
 *       404:
 *         description: Company not found
 *       500:
 *         description: Failed to fetch profile
 *   put:
 *     summary: Update company profile
 *     tags: [Company]
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

    // Find user and get their associated company
    const user = await User.findById(userId).populate("company");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.company) {
      return NextResponse.json(
        { error: "No company associated with this user" },
        { status: 404 },
      );
    }

    return NextResponse.json(user.company, { status: 200 });
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

    // Find user and get their associated company
    const user = await User.findById(userId).populate("company");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.company) {
      return NextResponse.json(
        { error: "No company associated with this user" },
        { status: 404 },
      );
    }

    // Update the company details
    const company = await Company.findByIdAndUpdate(
      user.company._id || user.company.id,
      {
        name: name || user.company.name,
        phoneNumber: phoneNumber || user.company.phoneNumber,
        email: email || user.company.email,
        address: address || user.company.address,
        rate: rate || user.company.rate,
        updatedAt: new Date(),
      },
      { returnDocument: "after" },
    ).populate("warehouses");

    return NextResponse.json(company, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
