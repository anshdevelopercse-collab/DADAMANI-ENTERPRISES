import { GemFee } from '../models/gem-fee.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { IGemFeeDocument } from '../interfaces/finance.interface.js';
import { assertPositiveAmount } from './finance-validation.util.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class GemFeeService {
  async list(params: PaginationParams & { workOrder?: string; entity?: string }, firmScope?: FirmScope): Promise<PaginatedResult<IGemFeeDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope) };
    if (params.workOrder) filter.workOrder = params.workOrder;
    if (params.entity) filter.entity = params.entity;
    if (params.search) { const s = escapeRegex(params.search); filter.$or = [{ feeType: { $regex: s, $options: 'i' } }, { description: { $regex: s, $options: 'i' } }]; }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      GemFee.find(filter).sort({ paymentDate: -1 }).skip(skip).limit(limit).populate('workOrder', 'orderNumber title clientName').populate('tenderRef', 'tenderNumber title').exec(),
      GemFee.countDocuments(filter).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { data, pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } };
  }

  async getById(id: string, firmScope?: FirmScope): Promise<IGemFeeDocument> {
    const fee = await GemFee.findById(id).populate('workOrder', 'orderNumber title clientName').populate('tenderRef', 'tenderNumber title');
    if (!fee) throw ApiError.notFound('GEM fee record not found');
    assertFirmAccess((fee as any).entity, firmScope);
    return fee;
  }

  async create(data: any, createdById: string): Promise<IGemFeeDocument> {
    const amountError = assertPositiveAmount(data.amount, 'Fee amount');
    if (amountError) throw ApiError.badRequest(amountError);

    const workOrder = await WorkOrder.findById(data.workOrder);
    if (!workOrder) throw ApiError.notFound('Work order (contract) not found');

    // Inherit entity from parent work order — never from caller body.
    const entity = (workOrder as any).entity ?? undefined;

    // ratePercent, if given, is informational only — amount is never derived
    // from it, matching the brief's "do not hardcode a GEM percentage".
    return GemFee.create({ ...data, createdBy: createdById, ...(entity ? { entity } : {}) });
  }

  async delete(id: string, firmScope?: FirmScope): Promise<void> {
    const fee = await GemFee.findById(id);
    if (!fee) throw ApiError.notFound('GEM fee record not found');
    assertFirmAccess((fee as any).entity, firmScope);
    await GemFee.findByIdAndDelete(id);
  }
}
