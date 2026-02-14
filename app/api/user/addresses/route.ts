import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const user = await User.findById(userId).select("locations").lean();
    const locations = user?.locations || [];

    return NextResponse.json({ locations });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, location } = body;

    if (!userId || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { locations: location } },
      { new: true },
    )
      .select("locations")
      .lean();

    return NextResponse.json({ locations: user?.locations }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
