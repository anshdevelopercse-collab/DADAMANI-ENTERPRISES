import { GemFee } from '../models/gem-fee.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult } from '../interfaces/common.interface.js';
import { IGemFeeDocument } from '../interfaces/finance.interface.js';
import { assertPositiveAmount } from './finance-validation.util.js';

export class GemFeeService {
  async list(params: PaginationParams & { workOrder?: string; entity?: string }): Promise<PaginatedResult<IGemFeeDocument>> {
    const filter: any = {};
    if (params.workOrder) filter.workOrder = params.workOrder;
    if (params.entity) filter.entity = params.entity;
    if (params.search) filter.$or = [{ feeType: { $regex: params.search, $options: 'i' } }, { description: { $regex: params.search, $options: 'i' } }];

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

  async getById(id: string): Promise<IGemFeeDocument> {
    const fee = await GemFee.findById(id).populate('workOrder', 'orderNumber title clientName').populate('tenderRef', 'tenderNumber title');
    if (!fee) throw ApiError.notFound('GEM fee record not found');
    return fee;
  }

  async create(data: any, createdById: string): Promise<IGemFeeDocument> {
    const amountError = assertPositiveAmount(data.amount, 'Fee amount');
    if (amountError) throw ApiError.badRequest(amountError);

    const workOrder = await WorkOrder.findById(data.workOrder);
    if (!workOrder) throw ApiError.notFound('Work order (contract) not found');

    // ratePercent, if given, is informational only — amount is never derived
    // from it, matching the brief's "do not hardcode a GEM percentage".
    return GemFee.create({ ...data, createdBy: createdById });
  }

  async delete(id: string): Promise<void> {
    const fee = await GemFee.findById(id);
    if (!fee) throw ApiError.notFound('GEM fee record not found');
    await GemFee.findByIdAndDelete(id);
  }
}
