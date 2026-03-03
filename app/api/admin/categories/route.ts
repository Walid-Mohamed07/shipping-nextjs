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
      .select("-__v")
      .sort({ createdAt: 1 })
      .lean();

    // Convert _id to string for proper serialization
    const categoriesWithStringId = categories.map(cat => ({
      ...cat,
      _id: cat._id.toString()
    }));

    return NextResponse.json({ categories: categoriesWithStringId }, { status: 200 });
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

    const { name, nameEn, nameAr, description } = await request.json();

    // Support both bilingual object and legacy string
    let categoryName: any;
    if (nameEn || nameAr) {
      if (!nameEn?.trim() || !nameAr?.trim()) {
        return NextResponse.json(
          { error: "Both English and Arabic category names are required" },
          { status: 400 },
        );
      }
      categoryName = { en: nameEn.trim(), ar: nameAr.trim() };
    } else if (name) {
      if (typeof name === "object") {
        if (!name.en?.trim() || !name.ar?.trim()) {
          return NextResponse.json(
            { error: "Both English and Arabic category names are required" },
            { status: 400 },
          );
        }
        categoryName = { en: name.en.trim(), ar: name.ar.trim() };
      } else {
        if (!name.trim()) {
          return NextResponse.json(
            { error: "Category name is required" },
            { status: 400 },
          );
        }
        categoryName = { en: name.trim(), ar: name.trim() };
      }
    } else {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const category = new Category({
      name: categoryName,
      description: description || "",
    });

    await category.save();

    // Convert to plain object and ensure _id is string
    const categoryObj = category.toObject();
    const categoryWithStringId = {
      ...categoryObj,
      _id: categoryObj._id.toString()
    };

    return NextResponse.json(
      { category: categoryWithStringId, message: "Category created successfully" },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
