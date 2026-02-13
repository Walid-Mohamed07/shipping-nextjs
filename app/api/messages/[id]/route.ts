import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messagesPath = path.join(process.cwd(), "data", "messages.json");
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

    const message = messagesData.messages.find((m: any) => m.id === id);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(message, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, readAt } = body;

    const messagesPath = path.join(process.cwd(), "data", "messages.json");
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

    const messageIndex = messagesData.messages.findIndex(
      (m: any) => m.id === id
    );

    if (messageIndex === -1) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (status) {
      messagesData.messages[messageIndex].status = status;
    }

    if (readAt) {
      messagesData.messages[messageIndex].readAt = readAt;
    }

    fs.writeFileSync(messagesPath, JSON.stringify(messagesData, null, 2));

    return NextResponse.json(messagesData.messages[messageIndex], {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to update message:", error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}
