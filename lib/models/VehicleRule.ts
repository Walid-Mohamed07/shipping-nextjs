import mongoose from 'mongoose';

const vehicleRuleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
    },
    vehicleName: String,
    maxWeight: Number,
    maxDimensions: String,
    allowedCategories: [String],
    minDeliveryDays: Number,
    maxDeliveryDays: Number,
  },
  { timestamps: true }
);

export const VehicleRule = mongoose.models.VehicleRule || mongoose.model('VehicleRule', vehicleRuleSchema);
