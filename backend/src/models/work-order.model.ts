import mongoose, { Schema } from 'mongoose';
import { IWorkOrderDocument } from '../interfaces/work-order.interface.js';
import { WorkOrderStatus } from '../constants/status.constant.js';

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    completedAt: { type: Date },
    progressPercentage: { type: Number, default: 0 },
  },
  { _id: true }
);

const WorkOrderSchema = new Schema<IWorkOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    // Optional until entity backfill is approved (architecture doc §8) — never required yet.
    entity: { type: Schema.Types.ObjectId, ref: 'Company' },
    relatedTender: { type: Schema.Types.ObjectId, ref: 'Tender' },
    assignedProject: { type: String, required: true },
    siteLocation: { type: String, required: true },
    assignedManager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedVehicles: [{ type: Schema.Types.ObjectId, ref: 'Vehicle' }],
    assignedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver' }],
    // New generic-workforce assignment, parallel to assignedDrivers (kept for backward compatibility).
    assignedWorkforce: [{ type: Schema.Types.ObjectId, ref: 'Workforce' }],
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
    },
    startDate: { type: Date, required: true },
    targetEndDate: { type: Date, required: true },
    actualEndDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(WorkOrderStatus),
      default: WorkOrderStatus.DRAFT,
      index: true,
    },
    contractValue: { type: Number, required: true, min: 0 },
    invoicedAmount: { type: Number, default: 0 },
    invoiceNumber: { type: String },
    invoiceDate: { type: Date },
    invoiceStatus: {
      type: String,
      enum: ['Not Invoiced', 'Draft', 'Sent', 'Paid', 'Partially Paid'],
      default: 'Not Invoiced',
    },
    scopeDetails: { type: String },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    milestones: [MilestoneSchema],
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userName: { type: String, required: true },
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, default: 0 },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

WorkOrderSchema.index({
  orderNumber: 'text',
  title: 'text',
  clientName: 'text',
  assignedProject: 'text',
  siteLocation: 'text',
});

export const WorkOrder = mongoose.model<IWorkOrderDocument>('WorkOrder', WorkOrderSchema);
