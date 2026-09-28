import mongoose, { Schema } from 'mongoose';
import { IWorkforceAllocationDocument } from '../interfaces/workforce.interface.js';

const WorkforceAllocationSchema = new Schema<IWorkforceAllocationDocument>(
  {
    workforce: { type: Schema.Types.ObjectId, ref: 'Workforce', required: true, index: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['Active', 'Ended'], default: 'Active', index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    endedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

WorkforceAllocationSchema.index({ workforce: 1, status: 1 });

export const WorkforceAllocation = mongoose.model<IWorkforceAllocationDocument>(
  'WorkforceAllocation',
  WorkforceAllocationSchema
);
