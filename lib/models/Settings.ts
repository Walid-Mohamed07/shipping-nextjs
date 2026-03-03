import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // Unique key to ensure single settings document
    key: {
      type: String,
      default: "global",
      unique: true,
    },
    // Headover/markup percentage (e.g., 5 = 5%)
    headoverPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      description: "Percentage markup added to company offers shown to clients",
    },
    // Store last updated by info
    lastUpdatedBy: {
      userId: String,
      userName: String,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

// Clear cached model in development to pick up schema changes
if (process.env.NODE_ENV === "development" && mongoose.models.Settings) {
  delete mongoose.models.Settings;
}

export const Settings = mongoose.model("Settings", settingsSchema);
