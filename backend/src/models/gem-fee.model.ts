import mongoose, { Schema } from 'mongoose';
import { IGemFeeDocument } from '../interfaces/finance.interface.js';

const GemFeeSchema = new Schema<IGemFeeDocument>(
  {
    entity: { type: Schema.Types.ObjectId, ref: 'Company' },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    tenderRef: { type: Schema.Types.ObjectId, ref: 'Tender' },
    feeType: { type: String, required: true, trim: true },
    ratePercent: { type: Number, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, required: true },
    description: { type: String },
    document: { type: Schema.Types.ObjectId, ref: 'DocumentRecord' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const GemFee = mongoose.model<IGemFeeDocument>('GemFee', GemFeeSchema);
