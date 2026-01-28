import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

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
    // Generate JWT token with user context
    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      locations: user.locations,
      role: user.role,
    }, JWT_SECRET, { expiresIn: "7d" });
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
        token,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
