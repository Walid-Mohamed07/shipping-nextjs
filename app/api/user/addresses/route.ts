import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Address } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const addresses = await Address.find({ userId }).lean();
    return NextResponse.json({ addresses });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, primary } = body;
    console.log("New address data received:", body);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required fields: userId" },
        { status: 400 },
      );
    }

    // If this address is being set as primary, unset all other primary addresses for this user
    if (primary) {
      await Address.updateMany(
        { userId, primary: true },
        { $set: { primary: false } }
      );
    }

    const newAddress = await Address.create(body);
    
    // Return the full updated addresses list
    const addresses = await Address.find({ userId }).lean();
    return NextResponse.json({ addresses, address: newAddress }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// PUT route for updating an address
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, addressId, ...updateData } = body;

    if (!userId || !addressId) {
      return NextResponse.json(
        { error: "Missing required fields: userId or addressId" },
        { status: 400 },
      );
    }

    // If this address is being set as primary, unset all other primary addresses for this user
    if (updateData.primary) {
      await Address.updateMany(
        { userId, primary: true, _id: { $ne: addressId } },
        { $set: { primary: false } }
      );
    }

    // Update the address
    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Return the updated addresses list
    const addresses = await Address.find({ userId }).lean();
    return NextResponse.json({ addresses, address: updatedAddress });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, addressId } = body;

    if (!userId || !addressId) {
      return NextResponse.json(
        { error: "Missing required fields: userId or addressId" },
        { status: 400 },
      );
    }

    // Delete the address
    await Address.findByIdAndDelete(addressId);

    // Return updated addresses list
    const addresses = await Address.find({ userId }).lean();
    return NextResponse.json({ addresses });
  } catch (error) {
    return handleError(error);
  }
}
