import { Workforce } from '../models/workforce.model.js';
import { WorkforceAllocation } from '../models/workforce-allocation.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult } from '../interfaces/common.interface.js';
import { IWorkforceDocument, IWorkforceAllocationDocument } from '../interfaces/workforce.interface.js';
import { Types } from 'mongoose';

/**
 * Pure check, no I/O — kept standalone so it's unit-testable without a
 * database (see tests/workforce.test.ts), same pattern as
 * rangesOverlap() in vehicle-allocation.service.ts.
 *
 * Deliberately a no-op (`false`, i.e. no violation) whenever either side is
 * unset: today nothing in the database has an entity assigned yet, so this
 * guard has to stay inert until the entity backfill in the architecture doc
 * is approved and executed — otherwise it would incorrectly block every
 * workforce assignment in the system right now. Once both sides carry real
 * entity ids, the rule activates on its own with no code change needed.
 */
export function isCrossEntityViolation(
  workforceEntity?: Types.ObjectId | string | null,
  contractEntity?: Types.ObjectId | string | null
): boolean {
  if (!workforceEntity || !contractEntity) return false;
  return workforceEntity.toString() !== contractEntity.toString();
}

export class WorkforceService {
  async getWorkforce(params: PaginationParams & { type?: string }): Promise<PaginatedResult<IWorkforceDocument>> {
    const filter: any = {};
    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { phone: { $regex: params.search, $options: 'i' } },
        { licenseNumber: { $regex: params.search, $options: 'i' } },
      ];
    }
    if (params.status) filter.status = params.status;
    if (params.type) filter.type = params.type;

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Workforce.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Workforce.countDocuments(filter).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { data, pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } };
  }

  async getById(id: string): Promise<IWorkforceDocument> {
    const workforce = await Workforce.findById(id);
    if (!workforce) throw ApiError.notFound('Workforce member not found');
    return workforce;
  }

  async create(data: any, createdById: string): Promise<IWorkforceDocument> {
    if (data.licenseNumber) {
      const existing = await Workforce.findOne({ licenseNumber: data.licenseNumber.toUpperCase().trim() });
      if (existing) throw ApiError.conflict(`Workforce member with license ${data.licenseNumber} already exists`);
      data.licenseNumber = data.licenseNumber.toUpperCase().trim();
    }
    return Workforce.create({ ...data, createdBy: createdById });
  }

  async update(id: string, data: any): Promise<IWorkforceDocument> {
    const workforce = await Workforce.findByIdAndUpdate(id, data, { new: true });
    if (!workforce) throw ApiError.notFound('Workforce member not found');
    return workforce;
  }

  async delete(id: string): Promise<void> {
    const workforce = await Workforce.findById(id);
    if (!workforce) throw ApiError.notFound('Workforce member not found');
    await Workforce.findByIdAndDelete(id);
  }

  /**
   * Assigns (or reassigns) a workforce member to a work order. Reassignment
   * ends whatever allocation is currently active for that person (history
   * preserved, not overwritten) before opening the new one — a person works
   * one contract at a time, mirroring how Driver.assignedVehicle worked, but
   * now as a queryable, auditable allocation trail instead of a bare field.
   */
  async assign(workforceId: string, workOrderId: string, assignedById: string, notes?: string): Promise<IWorkforceAllocationDocument> {
    const [workforce, workOrder] = await Promise.all([
      Workforce.findById(workforceId),
      WorkOrder.findById(workOrderId),
    ]);
    if (!workforce) throw ApiError.notFound('Workforce member not found');
    if (!workOrder) throw ApiError.notFound('Work order not found');

    if (isCrossEntityViolation(workforce.entity, (workOrder as any).entity)) {
      throw ApiError.conflict(
        'This workforce member belongs to a different entity than this contract. Cross-entity assignment is not permitted.',
        'RES_004'
      );
    }

    const current = await WorkforceAllocation.findOne({ workforce: workforceId, status: 'Active' });
    if (current) {
      current.status = 'Ended';
      current.endedBy = assignedById as any;
      current.endedAt = new Date();
      current.endDate = new Date();
      await current.save();
    }

    return WorkforceAllocation.create({
      workforce: workforceId,
      workOrder: workOrderId,
      startDate: new Date(),
      status: 'Active',
      assignedBy: assignedById,
      notes,
    });
  }

  async getHistory(workforceId: string, params: PaginationParams = {}): Promise<PaginatedResult<IWorkforceAllocationDocument>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = { workforce: workforceId };
    const [data, total] = await Promise.all([
      WorkforceAllocation.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workOrder', 'orderNumber title clientName status')
        .populate('assignedBy', 'name email')
        .exec(),
      WorkforceAllocation.countDocuments(filter).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { data, pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } };
  }
}
