import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    userId: String,
    name: {
      type: String,
      required: true,
    },
    phoneNumber: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    address: String,
    rate: String,
    warehouses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
      },
    ],
  },
  { timestamps: true }
);

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
