import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    profilePicture: String,
    mobile: String,
    nationalOrPassportNumber: String,
    birthDate: String,
    idImage: String,
    licenseImage: String,
    criminalRecord: String,
    role: {
      type: String,
      enum: ['client', 'admin', 'driver', 'operator', 'company', 'warehouse_manager'],
      default: 'client',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    locations: [
      {
        id: String,
        country: String,
        countryCode: String,
        fullName: String,
        mobile: String,
        street: String,
        building: String,
        city: String,
        district: String,
        governorate: String,
        postalCode: String,
        landmark: String,
        addressType: {
          type: String,
          enum: ['Home', 'Office', 'Other'],
        },
        deliveryInstructions: String,
        primary: Boolean,
        warehouseId: String,
        pickupMode: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
