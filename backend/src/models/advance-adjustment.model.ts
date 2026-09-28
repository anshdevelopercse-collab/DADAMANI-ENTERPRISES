import mongoose, { Schema } from 'mongoose';
import { IAdvanceAdjustmentDocument } from '../interfaces/finance.interface.js';

// Immutable ledger row: created once, never updated. Corrections are made by
// creating an offsetting record, never by editing history in place — see
// architecture doc §4 ("Immutable once created").
const AdvanceAdjustmentSchema = new Schema<IAdvanceAdjustmentDocument>(
  {
    advance: { type: Schema.Types.ObjectId, ref: 'ContractAdvance', required: true, index: true },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    amountAdjusted: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const AdvanceAdjustment = mongoose.model<IAdvanceAdjustmentDocument>('AdvanceAdjustment', AdvanceAdjustmentSchema);
