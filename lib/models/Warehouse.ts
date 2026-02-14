import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    country: {
      type: String,
      required: true,
    },
    state: String,
    location: String,
    latitude: Number,
    longitude: Number,
    capacity: Number,
    currentStock: {
      type: Number,
      default: 0,
    },
    manager: String,
    contact: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    stockType: {
      type: String,
      default: 'all',
    },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
