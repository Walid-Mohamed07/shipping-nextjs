import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    profilePicture: String,
    mobile: String,
    nationalOrPassportNumber: String,
    birthDate: String,
    idImage: String,
    licenseImage: String,
    criminalRecord: String,
    role: {
      type: String,
      enum: [
        "client",
        "admin",
        "driver",
        "operator",
      ],
      default: "client",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    // User's country (used for default currency determination for clients)
    country: {
      type: String,
    },
    // User's preferred currency for displaying prices
    preferredCurrency: {
      type: String,
      default: "USD",
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    // OTP Verification fields
    emailVerified: {
      type: Boolean,
      default: false,
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },
    emailOTP: {
      code: String,
      expiresAt: Date,
    },
    mobileOTP: {
      code: String,
      expiresAt: Date,
    },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
