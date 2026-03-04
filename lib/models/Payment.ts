import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "wallet", "cash"],
      required: true,
    },
    // Kashier payment details
    kashierOrderId: String,
    kashierTransactionId: String,
    kashierPaymentUrl: String,
    kashierResponse: mongoose.Schema.Types.Mixed,
    // If paid from wallet
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    // Payment breakdown
    breakdown: {
      shippingCost: Number,
      serviceFee: Number,
      tax: Number,
      discount: Number,
      walletDeduction: Number,
      cardAmount: Number,
    },
    // Metadata
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date,
    refundReason: String,
    failureReason: String,
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ request: 1 });
paymentSchema.index({ kashierOrderId: 1 });
paymentSchema.index({ kashierTransactionId: 1 });
paymentSchema.index({ status: 1 });

// Clear cached model in development
if (process.env.NODE_ENV === "development" && mongoose.models.Payment) {
  delete mongoose.models.Payment;
}

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
