import { WorkOrderRepository } from '../repositories/index.js';
import { IWorkOrderDocument } from '../interfaces/work-order.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { WorkOrderStatus } from '../constants/status.constant.js';
import { EmailService } from './email.service.js';
import { User } from '../models/user.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { VehicleAllocationService } from './vehicle-allocation.service.js';
import { runInTransaction } from '../utils/transaction.util.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class WorkOrderService {
  private workOrderRepo = new WorkOrderRepository();
  private vehicleAllocationService = new VehicleAllocationService();

  async getWorkOrders(params: PaginationParams, firmScope?: FirmScope): Promise<PaginatedResult<IWorkOrderDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope) };
    if (params.search) {
      const s = escapeRegex(params.search);
      filter.$or = [
        { orderNumber: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { clientName: { $regex: s, $options: 'i' } },
        { assignedProject: { $regex: s, $options: 'i' } },
        { siteLocation: { $regex: s, $options: 'i' } },
      ];
    }
    if (params.status) filter.status = params.status;
    if (params.priority) filter.priority = params.priority;
    if (params.assignedManager) filter.assignedManager = params.assignedManager;

    return this.workOrderRepo.paginate(filter, params, [
      { path: 'assignedManager', select: 'name email phone' },
      { path: 'assignedVehicles', select: 'registrationNumber make model capacityTonnes' },
      { path: 'assignedDrivers', select: 'name phone licenseNumber' },
      { path: 'relatedTender', select: 'tenderNumber title' },
    ]);
  }

  async getWorkOrderById(id: string, firmScope?: FirmScope): Promise<IWorkOrderDocument> {
    const wo = await this.workOrderRepo.findById(id, undefined, [
      { path: 'assignedManager', select: 'name email phone' },
      { path: 'assignedVehicles', select: 'registrationNumber make model capacityTonnes status' },
      { path: 'assignedDrivers', select: 'name phone licenseNumber' },
      { path: 'relatedTender', select: 'tenderNumber title estimatedValue' },
      { path: 'createdBy', select: 'name email' },
    ]);
    if (!wo) throw ApiError.notFound('Work order not found');
    assertFirmAccess((wo as any).entity, firmScope);
    return wo;
  }

  async createWorkOrder(data: any, createdById: string): Promise<IWorkOrderDocument> {
    const existing = await this.workOrderRepo.findOne({
      orderNumber: data.orderNumber.toUpperCase().trim(),
    });
    if (existing) {
      throw ApiError.conflict(`Work Order with number ${data.orderNumber} already exists`);
    }

    const vehicleIds: string[] = Array.isArray(data.assignedVehicles) ? data.assignedVehicles : [];

    // Fail fast, outside any transaction, with a clear per-vehicle message
    // before writing anything — this is the double-booking guard from the
    // architecture doc (finding #2): a vehicle already active/scheduled on
    // another work order for an overlapping window is rejected here.
    for (const vehicleId of vehicleIds) {
      await this.vehicleAllocationService.assertNoOverlap(vehicleId, data.startDate, data.targetEndDate);
    }

    // Work order creation + one allocation row per vehicle happen in a single
    // transaction: either the whole thing lands, or none of it does (no
    // work order left pointing at vehicles that were never actually reserved).
    const wo = await runInTransaction(async (session) => {
      const [created] = await WorkOrder.create(
        [
          {
            ...data,
            orderNumber: data.orderNumber.toUpperCase().trim(),
            createdBy: createdById as any,
          },
        ],
        { session }
      );

      for (const vehicleId of vehicleIds) {
        await this.vehicleAllocationService.allocate(
          vehicleId,
          created._id.toString(),
          data.startDate,
          data.targetEndDate,
          createdById,
          session
        );
      }

      return created;
    });

    if (data.assignedManager) {
      const manager = await User.findById(data.assignedManager);
      if (manager && manager.email) {
        await EmailService.sendWorkOrderAssignedEmail(
          manager.email,
          manager.name,
          wo.orderNumber,
          wo.title,
          wo.siteLocation
        );
      }
    }

    return wo;
  }

  async updateWorkOrder(id: string, data: any, updatedById?: string, firmScope?: FirmScope): Promise<IWorkOrderDocument> {
    if (data.status === WorkOrderStatus.COMPLETED && !data.actualEndDate) {
      data.actualEndDate = new Date();
      data.progressPercentage = 100;
    }

    const existing = await this.getWorkOrderById(id, firmScope);

    if (Array.isArray(data.assignedVehicles)) {
      const currentIds = (existing.assignedVehicles || []).map((v: any) => (v._id ? v._id.toString() : v.toString()));
      const nextIds: string[] = data.assignedVehicles.map((v: any) => v.toString());

      const added = nextIds.filter((v) => !currentIds.includes(v));
      const removed = currentIds.filter((v) => !nextIds.includes(v));

      for (const vehicleId of added) {
        await this.vehicleAllocationService.assertNoOverlap(
          vehicleId,
          data.startDate || existing.startDate,
          data.targetEndDate || existing.targetEndDate
        );
      }

      for (const vehicleId of added) {
        await this.vehicleAllocationService.allocate(
          vehicleId,
          id,
          data.startDate || existing.startDate,
          data.targetEndDate || existing.targetEndDate,
          updatedById || existing.createdBy.toString()
        );
      }

      for (const vehicleId of removed) {
        await this.vehicleAllocationService.endActiveAllocationForWorkOrder(
          vehicleId,
          id,
          updatedById || existing.createdBy.toString()
        );
      }
    }

    const updated = await this.workOrderRepo.updateById(id, data);
    if (!updated) throw ApiError.notFound('Work order not found');
    return updated;
  }

  async updateMilestone(
    id: string,
    milestoneId: string,
    status: 'Pending' | 'In Progress' | 'Completed',
    progressPercentage: number,
    firmScope?: FirmScope
  ): Promise<IWorkOrderDocument> {
    const wo = await this.getWorkOrderById(id, firmScope);
    const milestone = (wo.milestones as any)?.id(milestoneId);
    if (!milestone) throw ApiError.notFound('Milestone not found');

    milestone.status = status;
    milestone.progressPercentage = progressPercentage;
    if (status === 'Completed') {
      milestone.completedAt = new Date();
    }

    // Auto calculate overall work order progress
    if (wo.milestones && wo.milestones.length > 0) {
      const totalProgress = wo.milestones.reduce((acc, m) => acc + (m.progressPercentage || 0), 0);
      wo.progressPercentage = Math.round(totalProgress / wo.milestones.length);
      if (wo.progressPercentage === 100) {
        wo.status = WorkOrderStatus.COMPLETED;
        wo.actualEndDate = new Date();
      }
    }

    await wo.save();
    return wo;
  }

  async generateInvoice(
    id: string,
    invoiceNumber: string,
    invoicedAmount: number,
    invoiceStatus: 'Draft' | 'Sent' | 'Paid' | 'Partially Paid' = 'Sent',
    firmScope?: FirmScope
  ): Promise<IWorkOrderDocument> {
    const wo = await this.getWorkOrderById(id, firmScope);
    wo.invoiceNumber = invoiceNumber;
    wo.invoicedAmount = invoicedAmount;
    wo.invoiceDate = new Date();
    wo.invoiceStatus = invoiceStatus;
    wo.status = WorkOrderStatus.INVOICED;

    await wo.save();
    return wo;
  }

  async addComment(id: string, comment: string, user: any, firmScope?: FirmScope): Promise<IWorkOrderDocument> {
    const wo = await this.getWorkOrderById(id, firmScope);
    wo.comments = wo.comments || [];
    wo.comments.push({
      user: user._id,
      userName: user.name,
      comment,
      createdAt: new Date(),
    });
    await wo.save();
    return wo;
  }

  async deleteWorkOrder(id: string, firmScope?: FirmScope): Promise<void> {
    await this.getWorkOrderById(id, firmScope);
    await this.workOrderRepo.deleteById(id);
  }
}
