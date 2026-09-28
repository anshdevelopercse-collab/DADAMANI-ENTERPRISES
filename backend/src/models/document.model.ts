import mongoose, { Schema } from 'mongoose';
import { IDocumentRecordDocument } from '../interfaces/audit.interface.js';

const DocumentSchema = new Schema<IDocumentRecordDocument>(
  {
    title: { type: String, required: true, trim: true },
    folder: { type: String, required: true, default: 'General', index: true },
    category: { type: String, default: 'General' },
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String },
    tags: [{ type: String }],
    entityType: {
      type: String,
      enum: ['Tender', 'Vehicle', 'WorkOrder', 'User', 'Invoice', 'ContractAdvance', 'GemFee', 'Workforce', 'General'],
      default: 'General',
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    isArchived: { type: Boolean, default: false, index: true },
    parentDoc: { type: Schema.Types.ObjectId, ref: 'DocumentRecord', default: null, index: true },
    versionNumber: { type: Number, default: 1, min: 1 },
    isLatestVersion: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

DocumentSchema.index({ title: 'text', originalFileName: 'text', folder: 'text', category: 'text' });

export const DocumentRecord = mongoose.model<IDocumentRecordDocument>('DocumentRecord', DocumentSchema);
