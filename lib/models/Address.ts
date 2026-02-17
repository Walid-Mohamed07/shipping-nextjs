import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    country: String,
    countryCode: String,
    fullName: String,
    mobile: String,
    street: String,
    building: String,
    city: String,
    district: String,
    postalCode: String,
    landmark: String,
    addressType: {
      type: String,
      enum: ["Home", "Office", "Other"],
    },
    deliveryInstructions: String,
    primary: Boolean,
    warehouseId: String,
    pickupMode: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { timestamps: true },
);

export const Address =
  mongoose.models.Address || mongoose.model("Address", addressSchema);
