import mongoose, { Schema } from 'mongoose';
import { IVehicleAllocationDocument } from '../interfaces/vehicle-allocation.interface.js';

const VehicleAllocationSchema = new Schema<IVehicleAllocationDocument>(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['Scheduled', 'Active', 'Ended', 'Cancelled'],
      default: 'Active',
      index: true,
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    endedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

// The query the double-booking guard runs on every allocation attempt.
VehicleAllocationSchema.index({ vehicle: 1, status: 1 });

export const VehicleAllocation = mongoose.model<IVehicleAllocationDocument>(
  'VehicleAllocation',
  VehicleAllocationSchema
);
