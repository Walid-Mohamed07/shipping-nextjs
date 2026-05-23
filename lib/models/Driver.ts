import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    userId: String,
    name: {
      type: String,
      required: true,
    },
    phoneNumber: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    address: String,
    rate: {
      type: Number,
      default: 0,
    },
    logo: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true },
);

export const Driver =
  mongoose.models.Driver || mongoose.model("Driver", driverSchema);
