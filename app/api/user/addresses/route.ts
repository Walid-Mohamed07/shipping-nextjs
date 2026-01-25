import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const usersPath = path.join(process.cwd(), "data", "users.json");

function getUsersData() {
  return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
}

function saveUsersData(data: any) {
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));
}

// GET /api/user/addresses?userId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  const usersData = getUsersData();
  const user = usersData.users.find((u: any) => u.id === userId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ locations: user.locations || [] });
}

// POST /api/user/addresses (add new address)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, address } = body;
  if (!userId || !address)
    return NextResponse.json(
      { error: "Missing userId or address" },
      { status: 400 },
    );
  const usersData = getUsersData();
  const user = usersData.users.find((u: any) => u.id === userId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (address.primary) {
    user.locations.forEach((loc: any) => (loc.primary = false));
  }
  user.locations.push(address);
  saveUsersData(usersData);
  return NextResponse.json({ success: true, locations: user.locations });
}

// PUT /api/user/addresses (update address or set primary)
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { userId, address, setPrimary } = body;
  if (!userId || !address)
    return NextResponse.json(
      { error: "Missing userId or address" },
      { status: 400 },
    );
  const usersData = getUsersData();
  const user = usersData.users.find((u: any) => u.id === userId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  const idx = user.locations.findIndex(
    (loc: any) =>
      loc.postalCode === address.postalCode && loc.street === address.street,
  );
  if (idx === -1)
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  if (setPrimary) {
    user.locations.forEach((loc: any) => (loc.primary = false));
    user.locations[idx].primary = true;
  }
  user.locations[idx] = { ...user.locations[idx], ...address };
  saveUsersData(usersData);
  return NextResponse.json({ success: true, locations: user.locations });
}

// DELETE /api/user/addresses (delete address)
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { userId, address } = body;
  if (!userId || !address)
    return NextResponse.json(
      { error: "Missing userId or address" },
      { status: 400 },
    );
  const usersData = getUsersData();
  const user = usersData.users.find((u: any) => u.id === userId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  user.locations = user.locations.filter(
    (loc: any) =>
      !(loc.postalCode === address.postalCode && loc.street === address.street),
  );
  // If deleted address was primary, set first address as primary if any left
  if (
    !user.locations.some((loc: any) => loc.primary) &&
    user.locations.length > 0
  ) {
    user.locations[0].primary = true;
  }
  saveUsersData(usersData);
  return NextResponse.json({ success: true, locations: user.locations });
}
