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
    rate: {
      type: Number,
      default: 0,
    },
    logo: {
      type: String,
      default: undefined,
    },
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
