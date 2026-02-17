import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: String,
    senderName: String,
    senderEmail: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    recipientName: String,
    subject: String,
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'read', 'unread'],
      default: 'unread',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    attachments: [String],
    links: [String],
    readAt: Date,
    repliedAt: Date,
  },
  { timestamps: true }
);

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
