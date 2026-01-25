import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const usersPath = path.join(process.cwd(), "data", "users.json");
    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

    const user = usersData.users.find((u: any) => u.email === email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const primaryLocation = Array.isArray(user.locations)
      ? user.locations.find((loc: any) => loc.primary) || user.locations[0]
      : {};
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          locations: user.locations,
          role: user.role,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
