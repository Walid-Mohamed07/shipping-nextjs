import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message } from "@/lib/models";
import { handleError, handleValidationError } from "@/lib/apiHelpers";
import { randomUUID } from "crypto";

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get messages
 *     description: Fetch messages, optionally filtered by recipient email
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: query
 *         name: recipientEmail
 *         schema:
 *           type: string
 *         description: Filter messages by recipient email
 *     responses:
 *       200:
 *         description: Successfully retrieved messages
 *       500:
 *         description: Failed to fetch messages
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const recipientEmail = searchParams.get("recipientEmail");

    const query = recipientEmail ? { recipientEmail } : {};
    const messages = await Message.find(query).sort({ createdAt: -1 });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch messages");
  }
}

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     description: Create and send a new message
 *     tags:
 *       - Messages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               senderId:
 *                 type: string
 *               senderName:
 *                 type: string
 *               senderEmail:
 *                 type: string
 *                 format: email
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *               recipientName:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: ['low', 'normal', 'high']
 *               attachments:
 *                 type: array
 *               links:
 *                 type: array
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
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
      return handleValidationError("Missing required fields");
    }

    const newMessage = await Message.create({
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
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    return handleError(error, "Failed to create message");
  }
}
