import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: String,
    userName: String,
    action: {
      type: String,
      required: true,
    },
    description: String,
    resourceId: String,
    resourceType: String,
    changes: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
