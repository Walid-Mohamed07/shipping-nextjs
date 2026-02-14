import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Truck', 'Van', 'Pickup', 'Box Truck', 'Cargo Van'],
      required: true,
    },
    model: String,
    capacity: String,
    plateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['available', 'In Use', 'maintenance', 'retired'],
      default: 'available',
    },
    country: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
