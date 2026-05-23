import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Category } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Types } from "mongoose";

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category (admin only)
 *     tags: [Admin Categories]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
 *       200:
 *         description: Category updated successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to update category
 *   delete:
 *     summary: Delete a category (admin only)
 *     tags: [Admin Categories]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to delete category
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const { name, nameEn, nameAr, description, isActive } = await request.json();

    const updates: any = {};

    // Support bilingual name object or legacy string
    if (nameEn !== undefined || nameAr !== undefined) {
      if (!nameEn?.trim() || !nameAr?.trim()) {
        return NextResponse.json(
          { error: "Both English and Arabic category names are required" },
          { status: 400 },
        );
      }
      updates.name = { en: nameEn.trim(), ar: nameAr.trim() };
    } else if (name !== undefined) {
      if (typeof name === "object" && name !== null) {
        updates.name = { en: name.en?.trim() || "", ar: name.ar?.trim() || "" };
      } else if (typeof name === "string" && name.trim()) {
        updates.name = name.trim();
      }
    }

    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    const category = await Category.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Convert to plain object and ensure _id is string
    const categoryObj = category.toObject();
    const categoryWithStringId = {
      ...categoryObj,
      _id: categoryObj._id.toString()
    };

    return NextResponse.json(
      { category: categoryWithStringId, message: "Category updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Category deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}
