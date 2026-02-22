import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
    },
    driverId: {
      type: String,
      required: true,
    },
    vehicleId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Assigned', 'In Transit', 'Delivered', 'Cancelled'],
      default: 'Assigned',
    },
    estimatedDelivery: Date,
  },
  { timestamps: { createdAt: 'assignedAt', updatedAt: true } }
);

export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
