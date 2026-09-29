import { TenderRepository } from '../repositories/index.js';
import { ITenderDocument } from '../interfaces/tender.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { TenderStatus } from '../constants/status.constant.js';
import { EmailService } from './email.service.js';
import { User } from '../models/user.model.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class TenderService {
  private tenderRepo = new TenderRepository();

  async getTenders(params: PaginationParams, firmScope?: FirmScope): Promise<PaginatedResult<ITenderDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope) };

    // Archive filter
    if (params.isArchived !== undefined) {
      filter.isArchived = params.isArchived === 'true' || params.isArchived === true;
    } else {
      filter.isArchived = false;
    }

    if (params.search) {
      const s = escapeRegex(params.search);
      filter.$or = [
        { tenderNumber: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { clientName: { $regex: s, $options: 'i' } },
        { location: { $regex: s, $options: 'i' } },
      ];
    }

    if (params.status) {
      filter.status = params.status;
    }
    if (params.category) {
      filter.category = params.category;
    }
    if (params.startDate || params.endDate) {
      filter.submissionDeadline = {};
      if (params.startDate) filter.submissionDeadline.$gte = new Date(params.startDate);
      if (params.endDate) filter.submissionDeadline.$lte = new Date(params.endDate);
    }

    return this.tenderRepo.paginate(filter, params, [
      { path: 'assignedManager', select: 'name email phone' },
      { path: 'createdBy', select: 'name email' },
    ]);
  }

  async getTenderById(id: string, firmScope?: FirmScope): Promise<ITenderDocument> {
    const tender = await this.tenderRepo.findById(id, undefined, [
      { path: 'assignedManager', select: 'name email phone' },
      { path: 'createdBy', select: 'name email' },
      { path: 'comments.user', select: 'name email avatar' },
    ]);
    if (!tender) throw ApiError.notFound('Tender not found');
    assertFirmAccess((tender as any).entity, firmScope);
    return tender;
  }

  async createTender(data: any, createdById: string, userName: string): Promise<ITenderDocument> {
    const existing = await this.tenderRepo.findOne({ tenderNumber: data.tenderNumber.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Tender with number ${data.tenderNumber} already exists`);
    }

    const tender = await this.tenderRepo.create({
      ...data,
      tenderNumber: data.tenderNumber.toUpperCase(),
      createdBy: createdById as any,
      timeline: [
        {
          action: 'Tender Created',
          performedBy: createdById as any,
          performerName: userName,
          details: `Created draft tender ${data.tenderNumber}`,
          timestamp: new Date(),
        },
      ],
    });

    if (data.assignedManager) {
      const manager = await User.findById(data.assignedManager);
      if (manager && manager.email) {
        await EmailService.sendTenderAssignedEmail(
          manager.email,
          manager.name,
          tender.tenderNumber,
          tender.title,
          new Date(tender.submissionDeadline).toLocaleDateString()
        );
      }
    }

    return tender;
  }

  async updateTender(id: string, data: any, userId: string, userName: string, firmScope?: FirmScope): Promise<ITenderDocument> {
    const tender = await this.getTenderById(id, firmScope);

    const timelineEvent = {
      action: 'Tender Updated',
      performedBy: userId as any,
      performerName: userName,
      details: data.status && data.status !== tender.status ? `Status changed to ${data.status}` : 'Tender parameters updated',
      timestamp: new Date(),
    };

    const updated = await this.tenderRepo.updateById(id, {
      ...data,
      $push: { timeline: timelineEvent },
    });

    if (!updated) throw ApiError.notFound('Tender not found');
    return updated;
  }

  async addComment(id: string, commentText: string, user: any, firmScope?: FirmScope): Promise<ITenderDocument> {
    const tender = await this.getTenderById(id, firmScope);
    tender.comments = tender.comments || [];
    tender.comments.push({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      comment: commentText,
      createdAt: new Date(),
    });

    tender.timeline = tender.timeline || [];
    tender.timeline.push({
      action: 'Comment Added',
      performedBy: user._id,
      performerName: user.name,
      details: commentText.slice(0, 50),
      timestamp: new Date(),
    });

    await tender.save();
    return tender;
  }

  async archiveTender(id: string, userId: string, userName: string, firmScope?: FirmScope): Promise<ITenderDocument> {
    const tender = await this.getTenderById(id, firmScope);
    tender.isArchived = true;
    tender.archivedAt = new Date();
    tender.timeline = tender.timeline || [];
    tender.timeline.push({
      action: 'Tender Archived',
      performedBy: userId as any,
      performerName: userName,
      timestamp: new Date(),
    });
    await tender.save();
    return tender;
  }

  async restoreTender(id: string, userId: string, userName: string, firmScope?: FirmScope): Promise<ITenderDocument> {
    const tender = await this.getTenderById(id, firmScope);
    tender.isArchived = false;
    tender.archivedAt = undefined;
    tender.timeline = tender.timeline || [];
    tender.timeline.push({
      action: 'Tender Restored',
      performedBy: userId as any,
      performerName: userName,
      timestamp: new Date(),
    });
    await tender.save();
    return tender;
  }

  async deleteTender(id: string, firmScope?: FirmScope): Promise<void> {
    await this.getTenderById(id, firmScope);
    await this.tenderRepo.deleteById(id);
  }
}
