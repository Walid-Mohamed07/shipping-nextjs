import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Category, User } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Types } from "mongoose";

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *       500:
 *         description: Failed to fetch categories
 *   post:
 *     summary: Create a new category (admin only)
 *     tags: [Admin Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create category
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true })
      .select("-_id -__v")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Check admin authorization
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const { name, description } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 },
      );
    }

    const category = new Category({
      name: name.trim(),
      description: description || "",
    });

    await category.save();

    return NextResponse.json(
      { category, message: "Category created successfully" },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
