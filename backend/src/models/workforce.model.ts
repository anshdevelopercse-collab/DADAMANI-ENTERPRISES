import mongoose, { Schema } from 'mongoose';
import { IWorkforceDocument } from '../interfaces/workforce.interface.js';

const WorkforceSchema = new Schema<IWorkforceDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Driver', 'Operator', 'Mechanic', 'Supervisor', 'Other'],
      required: true,
      index: true,
    },
    entity: { type: Schema.Types.ObjectId, ref: 'Company' },
    phone: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    address: { type: String },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Terminated'],
      default: 'Active',
      index: true,
    },
    licenseNumber: { type: String, uppercase: true, trim: true },
    licenseExpiry: { type: Date },
    experienceYears: { type: Number, default: 1 },
    rating: { type: Number, default: 5 },
    legacyDriverId: { type: Schema.Types.ObjectId, ref: 'Driver', index: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkforceSchema.index({ name: 'text', phone: 'text', licenseNumber: 'text' });

export const Workforce = mongoose.model<IWorkforceDocument>('Workforce', WorkforceSchema);
