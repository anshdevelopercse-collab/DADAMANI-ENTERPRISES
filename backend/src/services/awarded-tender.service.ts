import { AwardedTenderRepository, TenderRepository } from '../repositories/index.js';
import { IAwardedTenderDocument } from '../interfaces/tender.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult } from '../interfaces/common.interface.js';
import { TenderStatus } from '../constants/status.constant.js';

export class AwardedTenderService {
  private awardedRepo = new AwardedTenderRepository();
  private tenderRepo = new TenderRepository();

  async getAwardedTenders(params: PaginationParams): Promise<PaginatedResult<IAwardedTenderDocument>> {
    const filter: any = {};
    if (params.search) {
      filter.$or = [
        { contractNumber: { $regex: params.search, $options: 'i' } },
        { tenderNumber: { $regex: params.search, $options: 'i' } },
        { clientName: { $regex: params.search, $options: 'i' } },
        { title: { $regex: params.search, $options: 'i' } },
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

  async getAwardedTenderById(id: string): Promise<IAwardedTenderDocument> {
    const awarded = await this.awardedRepo.findById(id, undefined, [
      { path: 'tender' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);
    if (!awarded) throw ApiError.notFound('Awarded tender record not found');
    return awarded;
  }

  async createAwardedTender(data: any, createdById: string): Promise<IAwardedTenderDocument> {
    const awardValue = Number(data.awardValue);
    const estimatedCost = Number(data.estimatedCost || 0);
    const projectedProfit = awardValue - estimatedCost;
    const profitMarginPercent = awardValue > 0 ? Number(((projectedProfit / awardValue) * 100).toFixed(2)) : 0;

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

  async updateAwardedTender(id: string, data: any): Promise<IAwardedTenderDocument> {
    if (data.awardValue !== undefined || data.estimatedCost !== undefined) {
      const existing = await this.getAwardedTenderById(id);
      const awardValue = data.awardValue !== undefined ? Number(data.awardValue) : existing.awardValue;
      const estimatedCost = data.estimatedCost !== undefined ? Number(data.estimatedCost) : existing.estimatedCost;
      data.projectedProfit = awardValue - estimatedCost;
      data.profitMarginPercent = awardValue > 0 ? Number(((data.projectedProfit / awardValue) * 100).toFixed(2)) : 0;
    }

    const updated = await this.awardedRepo.updateById(id, data);
    if (!updated) throw ApiError.notFound('Awarded tender not found');
    return updated;
  }

  async approveAwardedTender(id: string, approverId: string): Promise<IAwardedTenderDocument> {
    const awarded = await this.awardedRepo.updateById(id, {
      approvalStatus: 'Approved',
      approvedBy: approverId as any,
      approvedAt: new Date(),
    });
    if (!awarded) throw ApiError.notFound('Awarded tender not found');
    return awarded;
  }

  async deleteAwardedTender(id: string): Promise<void> {
    await this.getAwardedTenderById(id);
    await this.awardedRepo.deleteById(id);
  }
}
