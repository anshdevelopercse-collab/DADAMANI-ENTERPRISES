import mongoose, { Schema } from 'mongoose';
import { IContractAdvanceDocument } from '../interfaces/finance.interface.js';

const ContractAdvanceSchema = new Schema<IContractAdvanceDocument>(
  {
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    recipientType: { type: String, enum: ['Workforce', 'User', 'External'], required: true },
    recipientRef: { type: Schema.Types.ObjectId, refPath: 'recipientTypeModel' },
    recipientName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    document: { type: Schema.Types.ObjectId, ref: 'DocumentRecord' },
    totalAdjusted: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Virtual model-name resolver for recipientRef's refPath (Workforce or User; unused for External).
ContractAdvanceSchema.virtual('recipientTypeModel').get(function (this: any) {
  return this.recipientType === 'External' ? undefined : this.recipientType;
});

ContractAdvanceSchema.index({ workOrder: 1 });

export const ContractAdvance = mongoose.model<IContractAdvanceDocument>('ContractAdvance', ContractAdvanceSchema);
