import { NextRequest, NextResponse } from "next/server";
import { specs } from "@/lib/swagger";

/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API Documentation
 *     description: Swagger UI for API documentation and testing
 *     tags:
 *       - API Docs
 *     responses:
 *       200:
 *         description: Returns Swagger documentation
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(specs, { status: 200 });
  } catch (error) {
    console.error("Error fetching API docs:", error);
    return NextResponse.json(
      { error: "Failed to fetch API documentation" },
      { status: 500 },
    );
  }
}
