import { Invoice } from '../models/invoice.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { IInvoiceDocument } from '../interfaces/finance.interface.js';
import { assertPositiveAmount } from './finance-validation.util.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class InvoiceService {
  async list(params: PaginationParams & { workOrder?: string; entity?: string; billingMonth?: string }, firmScope?: FirmScope): Promise<PaginatedResult<IInvoiceDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope) };
    if (params.workOrder) filter.workOrder = params.workOrder;
    if (params.entity) filter.entity = params.entity;
    if (params.billingMonth) filter.billingMonth = params.billingMonth;
    if (params.status) filter.status = params.status;
    if (params.search) {
      const s = escapeRegex(params.search);
      filter.$or = [{ invoiceNumber: { $regex: s, $options: 'i' } }, { notes: { $regex: s, $options: 'i' } }];
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workOrder', 'orderNumber title clientName')
        .populate('vehicle', 'registrationNumber')
        .exec(),
      Invoice.countDocuments(filter).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { data, pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } };
  }

  async getById(id: string, firmScope?: FirmScope): Promise<IInvoiceDocument> {
    const invoice = await Invoice.findById(id).populate('workOrder', 'orderNumber title clientName').populate('vehicle', 'registrationNumber');
    if (!invoice) throw ApiError.notFound('Invoice not found');
    assertFirmAccess((invoice as any).entity, firmScope);
    return invoice;
  }

  async create(data: any, createdById: string): Promise<IInvoiceDocument> {
    const amountError = assertPositiveAmount(data.amount, 'Invoice amount');
    if (amountError) throw ApiError.badRequest(amountError);

    const workOrder = await WorkOrder.findById(data.workOrder);
    if (!workOrder) throw ApiError.notFound('Work order (contract) not found');

    // Inherit entity from parent work order — never from caller body.
    const entity = (workOrder as any).entity ?? undefined;

    const existing = await Invoice.findOne({ invoiceNumber: data.invoiceNumber.trim() });
    if (existing) throw ApiError.conflict(`Invoice ${data.invoiceNumber} already exists`);

    return Invoice.create({ ...data, invoiceNumber: data.invoiceNumber.trim(), createdBy: createdById, ...(entity ? { entity } : {}) });
  }

  async update(id: string, data: any, firmScope?: FirmScope): Promise<IInvoiceDocument> {
    if (data.amount !== undefined) {
      const amountError = assertPositiveAmount(data.amount, 'Invoice amount');
      if (amountError) throw ApiError.badRequest(amountError);
    }
    // totalAdjusted is a ledger-maintained field — never editable directly through this endpoint.
    delete data.totalAdjusted;

    const existing = await Invoice.findById(id);
    if (!existing) throw ApiError.notFound('Invoice not found');
    assertFirmAccess((existing as any).entity, firmScope);

    if (data.amount !== undefined && data.amount < (existing.totalAdjusted || 0)) {
      throw ApiError.badRequest('Invoice amount cannot be reduced below the total already adjusted against it');
    }

    const invoice = await Invoice.findByIdAndUpdate(id, data, { new: true });
    if (!invoice) throw ApiError.notFound('Invoice not found');
    return invoice;
  }

  async delete(id: string, firmScope?: FirmScope): Promise<void> {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw ApiError.notFound('Invoice not found');
    assertFirmAccess((invoice as any).entity, firmScope);
    if (invoice.totalAdjusted > 0) {
      throw ApiError.badRequest('Cannot delete an invoice that already has advance adjustments applied to it — cancel it instead');
    }
    await Invoice.findByIdAndDelete(id);
  }
}
