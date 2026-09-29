import { AwardedTenderRepository, TenderRepository } from '../repositories/index.js';
import { IAwardedTenderDocument } from '../interfaces/tender.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { TenderStatus } from '../constants/status.constant.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class AwardedTenderService {
  private awardedRepo = new AwardedTenderRepository();
  private tenderRepo = new TenderRepository();

  async getAwardedTenders(params: PaginationParams, firmScope?: FirmScope): Promise<PaginatedResult<IAwardedTenderDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope) };
    if (params.search) {
      const s = escapeRegex(params.search);
      filter.$or = [
        { contractNumber: { $regex: s, $options: 'i' } },
        { tenderNumber: { $regex: s, $options: 'i' } },
        { clientName: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
      ];
    }
    if (params.executionStatus) {
      filter.executionStatus = params.executionStatus;
    }
    if (params.approvalStatus) {
      filter.approvalStatus = params.approvalStatus;
    }

    return this.awardedRepo.paginate(filter, params, [
      { path: 'tender' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);
  }

  async getAwardedTenderById(id: string, firmScope?: FirmScope): Promise<IAwardedTenderDocument> {
    const awarded = await this.awardedRepo.findById(id, undefined, [
      { path: 'tender' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);
    if (!awarded) throw ApiError.notFound('Awarded tender record not found');
    assertFirmAccess((awarded as any).entity, firmScope);
    return awarded;
  }

  async createAwardedTender(data: any, createdById: string): Promise<IAwardedTenderDocument> {
    const awardValue = Number(data.awardValue);
    const estimatedCost = Number(data.estimatedCost || 0);
    const projectedProfit = awardValue - estimatedCost;
    const profitMarginPercent = awardValue > 0 ? Number(((projectedProfit / awardValue) * 100).toFixed(2)) : 0;

    // Inherit entity from the parent tender — never from caller body.
    if (data.tender) {
      const parentTender = await this.tenderRepo.findById(data.tender);
      if (parentTender && (parentTender as any).entity) {
        data.entity = (parentTender as any).entity;
      }
    }

    const awarded = await this.awardedRepo.create({
      ...data,
      awardValue,
      estimatedCost,
      projectedProfit,
      profitMarginPercent,
      createdBy: createdById as any,
    });

    // Update parent tender status to AWARDED
    if (data.tender) {
      await this.tenderRepo.updateById(data.tender, { status: TenderStatus.AWARDED });
    }

    return awarded;
  }

  async updateAwardedTender(id: string, data: any, firmScope?: FirmScope): Promise<IAwardedTenderDocument> {
    if (data.awardValue !== undefined || data.estimatedCost !== undefined) {
      const existing = await this.getAwardedTenderById(id, firmScope);
      const awardValue = data.awardValue !== undefined ? Number(data.awardValue) : existing.awardValue;
      const estimatedCost = data.estimatedCost !== undefined ? Number(data.estimatedCost) : existing.estimatedCost;
      data.projectedProfit = awardValue - estimatedCost;
      data.profitMarginPercent = awardValue > 0 ? Number(((data.projectedProfit / awardValue) * 100).toFixed(2)) : 0;
    } else {
      await this.getAwardedTenderById(id, firmScope);
    }

    const updated = await this.awardedRepo.updateById(id, data);
    if (!updated) throw ApiError.notFound('Awarded tender not found');
    return updated;
  }

  async approveAwardedTender(id: string, approverId: string, firmScope?: FirmScope): Promise<IAwardedTenderDocument> {
    await this.getAwardedTenderById(id, firmScope);
    const awarded = await this.awardedRepo.updateById(id, {
      approvalStatus: 'Approved',
      approvedBy: approverId as any,
      approvedAt: new Date(),
    });
    if (!awarded) throw ApiError.notFound('Awarded tender not found');
    return awarded;
  }

  async deleteAwardedTender(id: string, firmScope?: FirmScope): Promise<void> {
    await this.getAwardedTenderById(id, firmScope);
    await this.awardedRepo.deleteById(id);
  }
}
