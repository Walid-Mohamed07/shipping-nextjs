import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Settings } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get system settings including headover percentage
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get or create default settings
    let settings = await Settings.findOne({ key: "global" });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({
        key: "global",
        headoverPercentage: 0,
      });
    }

    return NextResponse.json(
      {
        success: true,
        settings: {
          headoverPercentage: settings.headoverPercentage,
          lastUpdatedBy: settings.lastUpdatedBy,
          updatedAt: settings.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update system settings (admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               headoverPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       500:
 *         description: Server error
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // Check authentication
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - only admins can update settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { headoverPercentage } = body;

    // Validate headoverPercentage
    if (headoverPercentage === undefined || headoverPercentage === null) {
      return NextResponse.json(
        { error: "headoverPercentage is required" },
        { status: 400 }
      );
    }

    const percentage = parseFloat(headoverPercentage);

    if (isNaN(percentage)) {
      return NextResponse.json(
        { error: "headoverPercentage must be a valid number" },
        { status: 400 }
      );
    }

    if (percentage < 0 || percentage > 100) {
      return NextResponse.json(
        { error: "headoverPercentage must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Update or create settings
    const settings = await Settings.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          headoverPercentage: percentage,
          lastUpdatedBy: {
            userId: currentUser.id,
            userName: currentUser.fullName || currentUser.username || currentUser.email,
            updatedAt: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Settings updated successfully",
        settings: {
          headoverPercentage: settings.headoverPercentage,
          lastUpdatedBy: settings.lastUpdatedBy,
          updatedAt: settings.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
