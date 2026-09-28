import mongoose, { Schema } from 'mongoose';
import { IDriverDocument } from '../interfaces/vehicle.interface.js';

const DriverSchema = new Schema<IDriverDocument>(
  {
    name: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    licenseExpiry: { type: Date, required: true },
    phone: { type: String, required: true, trim: true },
    emergencyContact: { type: String, trim: true },
    address: { type: String },
    assignedVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Terminated'],
      default: 'Active',
    },
    experienceYears: { type: Number, default: 1 },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const Driver = mongoose.model<IDriverDocument>('Driver', DriverSchema);
