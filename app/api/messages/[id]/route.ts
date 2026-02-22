import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { Message } from "@/lib/models";

/**
 * @swagger\n * /api/messages/:id:
 *   get:
 *     summary: Get a specific message by ID
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message details
 *       404:
 *         description: Message not found
 *       500:
 *         description: Failed to fetch message
 *   put:
 *     summary: Update message (mark as read, etc)
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               readAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       500:
 *         description: Failed to update message
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    const message = await Message.findById(id).lean();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(message, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status, readAt } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (readAt) updateData.readAt = new Date(readAt);
    updateData.updatedAt = new Date();

    const updatedMessage = await Message.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const messageIndex = messagesData.messages.findIndex(
      (m: any) => m.id === id,
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
      { status: 500 },
    );
  }
}
