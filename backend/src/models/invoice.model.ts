import mongoose, { Schema } from 'mongoose';
import { IInvoiceDocument } from '../interfaces/finance.interface.js';

const InvoiceSchema = new Schema<IInvoiceDocument>(
  {
    entity: { type: Schema.Types.ObjectId, ref: 'Company' },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    billingMonth: { type: String, required: true, index: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
    invoiceDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    totalAdjusted: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    document: { type: Schema.Types.ObjectId, ref: 'DocumentRecord' },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

InvoiceSchema.index({ workOrder: 1, billingMonth: 1 });

export const Invoice = mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);
