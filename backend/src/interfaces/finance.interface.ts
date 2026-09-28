import { Document, Types } from 'mongoose';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Cancelled';
export type AdvanceRecipientType = 'Workforce' | 'User' | 'External';

export interface IInvoice {
  // Optional until entity backfill is approved — never required yet.
  entity?: Types.ObjectId;
  workOrder: Types.ObjectId;
  vehicle?: Types.ObjectId;
  billingMonth: string; // 'YYYY-MM'
  invoiceNumber: string;
  invoiceDate: Date;
  amount: number;
  // Denormalized running total of AdvanceAdjustments applied to this invoice.
  // Maintained transactionally alongside each adjustment — never edited directly.
  totalAdjusted: number;
  status: InvoiceStatus;
  document?: Types.ObjectId; // ref DocumentRecord
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IInvoiceDocument extends IInvoice, Document {}

export interface IContractAdvance {
  workOrder: Types.ObjectId;
  recipientType: AdvanceRecipientType;
  // Set when recipientType is Workforce or User; omitted for an External
  // (one-off, non-employee) recipient, which is identified by name only —
  // per the brief, the recipient must not be forced into an artificial
  // employee/workforce record just to be recorded.
  recipientRef?: Types.ObjectId;
  recipientName: string;
  amount: number;
  date: Date;
  reason: string;
  document?: Types.ObjectId; // ref DocumentRecord
  // Denormalized running total of AdvanceAdjustments drawn against this advance.
  // Maintained transactionally alongside each adjustment — never edited directly.
  totalAdjusted: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IContractAdvanceDocument extends IContractAdvance, Document {}

export interface IAdvanceAdjustment {
  advance: Types.ObjectId;
  invoice: Types.ObjectId;
  amountAdjusted: number;
  date: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IAdvanceAdjustmentDocument extends IAdvanceAdjustment, Document {}

export interface IGemFee {
  entity?: Types.ObjectId; // optional until entity backfill is approved
  workOrder: Types.ObjectId;
  tenderRef?: Types.ObjectId;
  feeType: string;
  ratePercent?: number; // informational only — amount is always recorded independently, never derived
  amount: number;
  paymentDate: Date;
  description?: string;
  document?: Types.ObjectId; // ref DocumentRecord
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IGemFeeDocument extends IGemFee, Document {}
