import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    const usersPath = path.join(process.cwd(), "data", "users.json");
    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

    const userExists = usersData.users.find((u: any) => u.email === email);
    if (userExists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      name,
      locations: [
        {
          address: body.address || "",
          country: body.country || "",
          countryCode: body.countryCode || "",
          postalCode: body.postalCode || "",
          mobile: body.mobile || "",
          primary: true,
        },
      ],
      role: "client",
      createdAt: new Date().toISOString(),
    };

    usersData.users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));

    const primaryLocation = newUser.locations[0];
    // Generate JWT token with user context
    const JWT_SECRET = process.env.JWT_SECRET || "demo_secret";
    const token = jwt.sign({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      locations: newUser.locations,
      role: newUser.role,
    }, JWT_SECRET, { expiresIn: "7d" });
    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          locations: newUser.locations,
          role: newUser.role,
        },
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
