import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientEmail = searchParams.get("recipientEmail");

    const messagesPath = path.join(process.cwd(), "data", "messages.json");
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

    let messages = messagesData.messages;

    if (recipientEmail) {
      messages = messages.filter(
        (m: any) => m.recipientEmail === recipientEmail,
      );
    }

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderId,
      senderName,
      senderEmail,
      recipientEmail,
      recipientName,
      subject,
      message,
      priority = "normal",
      attachments = [],
      links = [],
    } = body;

    if (!senderEmail || !recipientEmail || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const messagesPath = path.join(process.cwd(), "data", "messages.json");
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

    const newMessage = {
      id: `msg-${randomUUID().split("-")[0]}`,
      senderId: senderId || "unknown",
      senderName: senderName || "Unknown",
      senderEmail,
      recipientEmail,
      recipientName: recipientName || "Unknown",
      subject,
      message,
      status: "sent",
      priority,
      attachments,
      links,
      createdAt: new Date().toISOString(),
      readAt: null,
      repliedAt: null,
    };

    messagesData.messages.push(newMessage);

    fs.writeFileSync(messagesPath, JSON.stringify(messagesData, null, 2));

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, status, readAt } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 },
      );
    }

    const messagesPath = path.join(process.cwd(), "data", "messages.json");
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

    const messageIndex = messagesData.messages.findIndex(
      (m: any) => m.id === messageId,
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
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 },
    );
  }
}
