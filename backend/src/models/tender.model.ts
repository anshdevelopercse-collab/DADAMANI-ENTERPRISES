import mongoose, { Schema } from 'mongoose';
import { ITenderDocument } from '../interfaces/tender.interface.js';
import { TenderStatus } from '../constants/status.constant.js';

const TenderCommentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    comment: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const TenderAttachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: false } }
);

const TenderTimelineSchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performerName: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TenderSchema = new Schema<ITenderDocument>(
  {
    tenderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    clientName: { type: String, required: true, trim: true, index: true },
    entity: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    clientDepartment: { type: String, trim: true },
    category: {
      type: String,
      enum: ['Logistics', 'Mining', 'Construction', 'Transport', 'Infrastructure', 'Government Supplies', 'Other'],
      default: 'Logistics',
      index: true,
    },
    estimatedValue: { type: Number, required: true, min: 0 },
    earnestMoneyDeposit: { type: Number, default: 0 },
    submissionDeadline: { type: Date, required: true, index: true },
    openingDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(TenderStatus),
      default: TenderStatus.DRAFT,
      index: true,
    },
    location: { type: String, required: true },
    state: { type: String },
    scopeOfWork: { type: String },
    assignedManager: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: [TenderAttachmentSchema],
    comments: [TenderCommentSchema],
    timeline: [TenderTimelineSchema],
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Full text search index
TenderSchema.index({
  tenderNumber: 'text',
  title: 'text',
  clientName: 'text',
  location: 'text',
  scopeOfWork: 'text',
});

export const Tender = mongoose.model<ITenderDocument>('Tender', TenderSchema);
