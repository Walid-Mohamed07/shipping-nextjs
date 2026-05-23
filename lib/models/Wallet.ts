import mongoose from "mongoose";

// Transaction schema for tracking all wallet movements
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit", "refund", "payment", "topup"],
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
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Link to request if payment is for a shipping request
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null,
    },
    // Payment gateway reference
    paymentGateway: {
      provider: String, // e.g., "kashier"
      transactionId: String,
      orderId: String,
      status: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    balanceBefore: Number,
    balanceAfter: Number,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Wallet schema - one per user
const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["active", "frozen", "closed"],
      default: "active",
    },
    // Total amounts for statistics
    totalCredits: {
      type: Number,
      default: 0,
    },
    totalDebits: {
      type: Number,
      default: 0,
    },
    lastTransactionAt: Date,
  },
  { timestamps: true }
);

// Index for faster lookups
// Note: walletSchema.user already has unique:true, so no separate index needed
transactionSchema.index({ user: 1, createdAt: -1 });
// Note: transactionSchema.reference already has unique:true + sparse:true, so no separate index needed
transactionSchema.index({ "paymentGateway.transactionId": 1 });
transactionSchema.index({ request: 1 });

// Clear cached models in development
if (process.env.NODE_ENV === "development") {
  if (mongoose.models.Wallet) delete mongoose.models.Wallet;
  if (mongoose.models.Transaction) delete mongoose.models.Transaction;
}

export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
