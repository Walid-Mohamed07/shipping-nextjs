import mongoose from "mongoose";

const costCriteriaSchema = new mongoose.Schema(
  {
    // Category-based rate
    categoryRates: [
      {
        category: {
          type: String,
          required: true,
        },
        baseRate: {
          type: Number,
          required: true,
        },
      },
    ],
    // Global multipliers and surcharges
    weightMultiplier: {
      type: Number,
      default: 1,
      description: "Multiplier for weight in cost calculation",
    },
    quantityMultiplier: {
      type: Number,
      default: 1,
      description: "Multiplier for quantity in cost calculation",
    },
    sameLocationMultiplier: {
      type: Number,
      default: 1,
      description: "Multiplier when source and destination are the same",
    },
    differentLocationMultiplier: {
      type: Number,
      default: 1.5,
      description: "Multiplier when source and destination are different",
    },
    urgentDeliverySurcharge: {
      type: Number,
      default: 1.25,
      description: "Surcharge multiplier for urgent/fast delivery",
    },
    minPrice: {
      type: Number,
      default: 0,
      description: "Minimum price for a shipment",
    },
    maxPrice: {
      type: Number,
      default: null,
      description: "Maximum price for a shipment (null for unlimited)",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
      description: "Version number for tracking changes",
    },
  },
  { timestamps: true },
);

export const CostCriteria =
  mongoose.models.CostCriteria ||
  mongoose.model("CostCriteria", costCriteriaSchema);
