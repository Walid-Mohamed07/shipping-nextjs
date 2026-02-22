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
        id: String,
        name: String,
        address: String,
        city: String,
        country: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
        createdAt: Date,
        updatedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
