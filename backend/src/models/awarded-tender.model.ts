import mongoose, { Schema } from 'mongoose';
import { IAwardedTenderDocument } from '../interfaces/tender.interface.js';

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    targetDate: { type: Date, required: true },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    billingAmount: { type: Number, default: 0 },
  },
  { _id: true }
);

const AwardedTenderSchema = new Schema<IAwardedTenderDocument>(
  {
    tender: { type: Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    tenderNumber: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    title: { type: String, required: true },
    awardValue: { type: Number, required: true, min: 0 },
    estimatedCost: { type: Number, required: true, min: 0 },
    projectedProfit: { type: Number, required: true },
    profitMarginPercent: { type: Number, required: true },
    awardedDate: { type: Date, required: true, index: true },
    startDate: { type: Date, required: true },
    completionDeadline: { type: Date, required: true, index: true },
    contractNumber: { type: String, required: true, unique: true, trim: true },
    vendorPartners: [{ type: String }],
    executionStatus: {
      type: String,
      enum: ['Pending Kickoff', 'In Progress', 'On Track', 'Delayed', 'Completed'],
      default: 'In Progress',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Rejected'],
      default: 'Approved',
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    milestones: [MilestoneSchema],
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, default: 0 },
        mimeType: { type: String },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const AwardedTender = mongoose.model<IAwardedTenderDocument>('AwardedTender', AwardedTenderSchema);
