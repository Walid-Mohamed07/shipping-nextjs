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
        "company",
        "warehouse_manager",
      ],
      default: "client",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
