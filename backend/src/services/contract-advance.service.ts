import { ContractAdvance } from '../models/contract-advance.model.js';
import { AdvanceAdjustment } from '../models/advance-adjustment.model.js';
import { Invoice } from '../models/invoice.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { IContractAdvanceDocument, IAdvanceAdjustmentDocument } from '../interfaces/finance.interface.js';
import { assertPositiveAmount, getRemainingAmount, validateAdjustmentAmount } from './finance-validation.util.js';
import { runInTransaction } from '../utils/transaction.util.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class ContractAdvanceService {
  async list(params: PaginationParams & { workOrder?: string }, firmScope?: FirmScope): Promise<PaginatedResult<IContractAdvanceDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope) };
    if (params.workOrder) filter.workOrder = params.workOrder;
    if (params.search) { const s = escapeRegex(params.search); filter.$or = [{ recipientName: { $regex: s, $options: 'i' } }, { reason: { $regex: s, $options: 'i' } }]; }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ContractAdvance.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate('workOrder', 'orderNumber title clientName').exec(),
      ContractAdvance.countDocuments(filter).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { data, pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } };
  }

  async getById(id: string, firmScope?: FirmScope): Promise<IContractAdvanceDocument> {
    const advance = await ContractAdvance.findById(id).populate('workOrder', 'orderNumber title clientName');
    if (!advance) throw ApiError.notFound('Contract advance not found');
    assertFirmAccess((advance as any).entity, firmScope);
    return advance;
  }

  async create(data: any, createdById: string): Promise<IContractAdvanceDocument> {
    const amountError = assertPositiveAmount(data.amount, 'Advance amount');
    if (amountError) throw ApiError.badRequest(amountError);

    const workOrder = await WorkOrder.findById(data.workOrder);
    if (!workOrder) throw ApiError.notFound('Work order (contract) not found');

    // Inherit entity from parent work order — never from caller body.
    const entity = (workOrder as any).entity ?? undefined;

    if (data.recipientType !== 'External' && !data.recipientRef) {
      throw ApiError.badRequest('recipientRef is required when recipientType is Workforce or User');
    }
    if (!data.recipientName) {
      throw ApiError.badRequest('recipientName is required so the advance recipient is always identifiable, even for a non-employee');
    }

    return ContractAdvance.create({ ...data, createdBy: createdById, ...(entity ? { entity } : {}) });
  }

  async getAdjustments(advanceId: string): Promise<IAdvanceAdjustmentDocument[]> {
    return AdvanceAdjustment.find({ advance: advanceId }).sort({ date: -1 }).populate('invoice', 'invoiceNumber amount billingMonth').exec();
  }

  /**
   * Applies a (partial or full) adjustment of a contract advance against an
   * invoice. Everything here is one atomic transaction: the immutable
   * AdvanceAdjustment ledger row is created, and both the advance's and the
   * invoice's running totals are updated together — never partially, and
   * never as a silent overwrite of `remainingAmount` (there is no such
   * stored field; it is always derived from amount - totalAdjusted).
   */
  async createAdjustment(advanceId: string, invoiceId: string, amountAdjusted: number, createdById: string, notes?: string): Promise<IAdvanceAdjustmentDocument> {
    // Pre-flight checks outside the transaction so they are testable without a replica set.
    const advancePre = await ContractAdvance.findById(advanceId);
    if (!advancePre) throw ApiError.notFound('Contract advance not found');

    const invoicePre = await Invoice.findById(invoiceId);
    if (!invoicePre) throw ApiError.notFound('Invoice not found');

    if (invoicePre.status === 'Cancelled') {
      throw ApiError.badRequest('Cannot apply an adjustment to a cancelled invoice');
    }

    if (advancePre.workOrder.toString() !== invoicePre.workOrder.toString()) {
      throw ApiError.badRequest('The advance and the invoice must belong to the same contract (Work Order)');
    }

    return runInTransaction(async (session) => {
      const advance = await ContractAdvance.findById(advanceId).session(session);
      if (!advance) throw ApiError.notFound('Contract advance not found');

      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) throw ApiError.notFound('Invoice not found');

      if (invoice.status === 'Cancelled') {
        throw ApiError.badRequest('Cannot apply an adjustment to a cancelled invoice');
      }

      if (advance.workOrder.toString() !== invoice.workOrder.toString()) {
        throw ApiError.badRequest('The advance and the invoice must belong to the same contract (Work Order)');
      }

      const remainingAdvance = getRemainingAmount(advance.amount, advance.totalAdjusted || 0);
      const remainingInvoice = getRemainingAmount(invoice.amount, invoice.totalAdjusted || 0);
      const validationError = validateAdjustmentAmount(amountAdjusted, remainingAdvance, remainingInvoice);
      if (validationError) throw ApiError.badRequest(validationError);

      const [adjustment] = await AdvanceAdjustment.create(
        [{ advance: advanceId, invoice: invoiceId, amountAdjusted, date: new Date(), notes, createdBy: createdById }],
        { session }
      );

      advance.totalAdjusted = (advance.totalAdjusted || 0) + amountAdjusted;
      await advance.save({ session });

      invoice.totalAdjusted = (invoice.totalAdjusted || 0) + amountAdjusted;
      invoice.status = invoice.totalAdjusted >= invoice.amount ? 'Paid' : 'Partially Paid';
      await invoice.save({ session });

      return adjustment;
    });
  }

  async delete(id: string, firmScope?: FirmScope): Promise<void> {
    const advance = await ContractAdvance.findById(id);
    if (!advance) throw ApiError.notFound('Contract advance not found');
    assertFirmAccess((advance as any).entity, firmScope);
    if (advance.totalAdjusted > 0) {
      throw ApiError.badRequest('Cannot delete an advance that already has adjustments recorded against it — the ledger is immutable');
    }
    await ContractAdvance.findByIdAndDelete(id);
  }
}
