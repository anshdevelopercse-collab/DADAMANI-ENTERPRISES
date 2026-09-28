import { z } from 'zod';

export const InvoiceCreateSchema = z.object({
  entity: z.string().optional(),
  workOrder: z.string().min(1, 'Work order (contract) is required'),
  vehicle: z.string().optional(),
  billingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'billingMonth must be in YYYY-MM format'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().or(z.date()),
  amount: z.number().positive('Invoice amount must be greater than zero'),
  status: z.enum(['Draft', 'Sent', 'Partially Paid', 'Paid', 'Cancelled']).default('Draft'),
  document: z.string().optional(),
  notes: z.string().optional(),
});

export const ContractAdvanceCreateSchema = z.object({
  workOrder: z.string().min(1, 'Work order (contract) is required'),
  recipientType: z.enum(['Workforce', 'User', 'External']),
  recipientRef: z.string().optional(),
  recipientName: z.string().min(1, 'Recipient name is required'),
  amount: z.number().positive('Advance amount must be greater than zero'),
  date: z.string().or(z.date()),
  reason: z.string().min(1, 'A reason/description is required'),
  document: z.string().optional(),
});

export const AdvanceAdjustmentCreateSchema = z.object({
  invoice: z.string().min(1, 'Invoice ID is required'),
  amountAdjusted: z.number().positive('Adjustment amount must be greater than zero'),
  notes: z.string().optional(),
});

export const GemFeeCreateSchema = z.object({
  entity: z.string().optional(),
  workOrder: z.string().min(1, 'Work order (contract) is required'),
  tenderRef: z.string().optional(),
  feeType: z.string().min(1, 'Fee type is required'),
  ratePercent: z.number().min(0).max(100).optional(),
  amount: z.number().positive('Fee amount must be greater than zero'),
  paymentDate: z.string().or(z.date()),
  description: z.string().optional(),
  document: z.string().optional(),
});
