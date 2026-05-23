import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Driver } from "@/lib/models";
import { uploadDriverLogo, deleteDriverLogo } from "@/lib/fileUpload";

/**
 * @swagger
 * /api/admin/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all drivers
 *       500:
 *         description: Failed to fetch drivers
 *   post:
 *     summary: Create a new driver
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phoneNumber]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Driver created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to create driver
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const drivers = await Driver.find({}).lean();

    // Transform _id to id for consistency
    const transformedDrivers = drivers.map((driver: any) => ({
      ...driver,
      id: driver._id.toString(),
    }));

    return NextResponse.json(transformedDrivers, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const formData = await request.formData();
    
    const name = formData.get("name") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const rate = formData.get("rate") as string;
    const address = formData.get("address") as string;
    const category = formData.get("category") as string;
    const logoFile = formData.get("logo") as File | null;

    if (!name || !phoneNumber || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let logoPath: string | undefined;
    if (logoFile && logoFile.size > 0) {
      logoPath = await uploadDriverLogo(logoFile);
    }

    const newDriver = new Driver({
      name,
      phoneNumber,
      email,
      rate: parseFloat(rate) || 0,
      address: address || "",
      category: category || "",
      logo: logoPath,
    });

    await newDriver.save();

    return NextResponse.json(
      {
        success: true,
        driver: newDriver,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating driver:", error);
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const formData = await request.formData();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const rate = formData.get("rate") as string;
    const address = formData.get("address") as string;
    const category = formData.get("category") as string;
    const logoFile = formData.get("logo") as File | null;
    const existingLogo = formData.get("existingLogo") as string | null;

    if (!id) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (email) updateData.email = email;
    if (rate !== undefined) updateData.rate = parseFloat(rate);
    if (address !== undefined) updateData.address = address;
    if (category !== undefined) updateData.category = category;

    // Handle logo upload/update
    if (logoFile && logoFile.size > 0) {
      // Delete old logo if exists
      if (existingLogo) {
        await deleteDriverLogo(existingLogo);
      }
      // Upload new logo
      updateData.logo = await uploadDriverLogo(logoFile);
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: "after" },
    );

    if (!updatedDriver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        driver: updatedDriver,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating driver:", error);
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 },
      );
    }

    const deletedDriver = await Driver.findByIdAndDelete(id);

    if (!deletedDriver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Delete associated logo file
    if (deletedDriver.logo) {
      await deleteDriverLogo(deletedDriver.logo);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return handleError(error);
  }
}
