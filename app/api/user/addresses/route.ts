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
    const { userId } = body;
    console.log("New address data received:", body);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required fields: userId" },
        { status: 400 },
      );
    }

    const newAddress = await Address.create(body);
    return NextResponse.json({ address: newAddress }, { status: 201 });
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
