import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { TenderService } from '../services/tender.service.js';
import { AwardedTenderService } from '../services/awarded-tender.service.js';
import { VehicleService } from '../services/vehicle.service.js';
import { WorkOrderService } from '../services/work-order.service.js';
import { UserService } from '../services/user.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const tenderService = new TenderService();
const awardedService = new AwardedTenderService();
const vehicleService = new VehicleService();
const workOrderService = new WorkOrderService();
const userService = new UserService();
const dashboardService = new DashboardService();

const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));

// --- Tenders Controller ---
export class TenderController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tenderService.getTenders(req.query as any, req.firmScope);
      ApiResponse.success(res, 'Tenders retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tender = await tenderService.getTenderById(getId(req.params.id), req.firmScope);
      ApiResponse.success(res, 'Tender details retrieved', tender);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const entityId = req.body.entity || (req.firmScope?.kind === 'firm' ? req.firmScope.firmId : undefined);
      const tender = await tenderService.createTender({ ...req.body, entity: entityId }, req.user?._id.toString()!, req.user?.name!);
      await logAudit(req, 'TENDERS', AuditAction.CREATE, `Created tender ${tender.tenderNumber}`, tender._id.toString());
      ApiResponse.created(res, 'Tender created successfully', tender);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tender = await tenderService.updateTender(getId(req.params.id), req.body, req.user?._id.toString()!, req.user?.name!, req.firmScope);
      await logAudit(req, 'TENDERS', AuditAction.UPDATE, `Updated tender ${tender.tenderNumber}`, tender._id.toString());
      ApiResponse.success(res, 'Tender updated successfully', tender);
    } catch (error) {
      next(error);
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tender = await tenderService.addComment(getId(req.params.id), req.body.comment, req.user, req.firmScope);
      ApiResponse.success(res, 'Comment added', tender);
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tender = await tenderService.archiveTender(getId(req.params.id), req.user?._id.toString()!, req.user?.name!, req.firmScope);
      await logAudit(req, 'TENDERS', AuditAction.ARCHIVE, `Archived tender ${tender.tenderNumber}`, tender._id.toString());
      ApiResponse.success(res, 'Tender archived', tender);
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tender = await tenderService.restoreTender(getId(req.params.id), req.user?._id.toString()!, req.user?.name!, req.firmScope);
      await logAudit(req, 'TENDERS', AuditAction.RESTORE, `Restored tender ${tender.tenderNumber}`, tender._id.toString());
      ApiResponse.success(res, 'Tender restored', tender);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      await tenderService.deleteTender(id, req.firmScope);
      await logAudit(req, 'TENDERS', AuditAction.DELETE, `Deleted tender with ID ${id}`, id);
      ApiResponse.success(res, 'Tender deleted permanently');
    } catch (error) {
      next(error);
    }
  }
}

// --- Awarded Tenders Controller ---
export class AwardedTenderController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await awardedService.getAwardedTenders(req.query as any, req.firmScope);
      ApiResponse.success(res, 'Awarded tenders retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await awardedService.getAwardedTenderById(getId(req.params.id), req.firmScope);
      ApiResponse.success(res, 'Awarded tender details retrieved', item);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await awardedService.createAwardedTender(req.body, req.user?._id.toString()!);
      await logAudit(req, 'AWARDED', AuditAction.CREATE, `Created awarded contract ${item.contractNumber}`, item._id.toString());
      ApiResponse.created(res, 'Awarded contract created', item);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await awardedService.updateAwardedTender(getId(req.params.id), req.body, req.firmScope);
      await logAudit(req, 'AWARDED', AuditAction.UPDATE, `Updated awarded contract ${item.contractNumber}`, item._id.toString());
      ApiResponse.success(res, 'Awarded contract updated', item);
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await awardedService.approveAwardedTender(getId(req.params.id), req.user?._id.toString()!, req.firmScope);
      await logAudit(req, 'AWARDED', AuditAction.UPDATE, `Approved contract ${item.contractNumber}`, item._id.toString());
      ApiResponse.success(res, 'Contract approved successfully', item);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await awardedService.deleteAwardedTender(getId(req.params.id), req.firmScope);
      await logAudit(req, 'AWARDED', AuditAction.DELETE, `Deleted awarded contract ID ${req.params.id}`);
      ApiResponse.success(res, 'Awarded contract deleted');
    } catch (error) {
      next(error);
    }
  }
}

// --- Vehicles Controller ---
export class VehicleController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await vehicleService.getVehicles(req.query as any, req.firmScope);
      ApiResponse.success(res, 'Vehicles retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.getVehicleById(getId(req.params.id));
      ApiResponse.success(res, 'Vehicle details retrieved', vehicle);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.createVehicle(req.body, req.user?._id.toString()!);
      await logAudit(req, 'VEHICLES', AuditAction.CREATE, `Added vehicle ${vehicle.registrationNumber}`, vehicle._id.toString());
      ApiResponse.created(res, 'Vehicle registered successfully', vehicle);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.updateVehicle(getId(req.params.id), req.body, req.firmScope);
      await logAudit(req, 'VEHICLES', AuditAction.UPDATE, `Updated vehicle ${vehicle.registrationNumber}`, vehicle._id.toString());
      ApiResponse.success(res, 'Vehicle updated', vehicle);
    } catch (error) {
      next(error);
    }
  }

  static async addMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.addMaintenanceRecord(getId(req.params.id), req.body);
      await logAudit(req, 'VEHICLES', AuditAction.UPDATE, `Added maintenance record for ${vehicle.registrationNumber}`);
      ApiResponse.success(res, 'Maintenance record logged', vehicle);
    } catch (error) {
      next(error);
    }
  }

  static async getComplianceAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = Number(req.query.days) || 30;
      const alerts = await vehicleService.getUpcomingComplianceExpiries(days);
      ApiResponse.success(res, 'Upcoming compliance alerts retrieved', alerts);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await vehicleService.deleteVehicle(getId(req.params.id), req.firmScope);
      await logAudit(req, 'VEHICLES', AuditAction.DELETE, `Deleted vehicle ID ${req.params.id}`);
      ApiResponse.success(res, 'Vehicle deleted');
    } catch (error) {
      next(error);
    }
  }

  // Drivers
  static async listDrivers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await vehicleService.getDrivers(req.query as any);
      ApiResponse.success(res, 'Drivers retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async createDriver(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await vehicleService.createDriver(req.body);
      ApiResponse.created(res, 'Driver created', driver);
    } catch (error) {
      next(error);
    }
  }
}

// --- Work Orders Controller ---
export class WorkOrderController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrderService.getWorkOrders(req.query as any, req.firmScope);
      ApiResponse.success(res, 'Work orders retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const wo = await workOrderService.getWorkOrderById(getId(req.params.id), req.firmScope);
      ApiResponse.success(res, 'Work order details retrieved', wo);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const wo = await workOrderService.createWorkOrder(req.body, req.user?._id.toString()!);
      await logAudit(req, 'WORK_ORDERS', AuditAction.CREATE, `Created work order ${wo.orderNumber}`, wo._id.toString());
      ApiResponse.created(res, 'Work order created', wo);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const wo = await workOrderService.updateWorkOrder(getId(req.params.id), req.body, req.user?._id.toString(), req.firmScope);
      await logAudit(req, 'WORK_ORDERS', AuditAction.UPDATE, `Updated work order ${wo.orderNumber}`, wo._id.toString());
      ApiResponse.success(res, 'Work order updated', wo);
    } catch (error) {
      next(error);
    }
  }

  static async updateMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { milestoneId, status, progressPercentage } = req.body;
      const wo = await workOrderService.updateMilestone(getId(req.params.id), milestoneId, status, progressPercentage, req.firmScope);
      ApiResponse.success(res, 'Milestone updated', wo);
    } catch (error) {
      next(error);
    }
  }

  static async invoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceNumber, invoicedAmount, invoiceStatus } = req.body;
      const wo = await workOrderService.generateInvoice(getId(req.params.id), invoiceNumber, invoicedAmount, invoiceStatus, req.firmScope);
      await logAudit(req, 'WORK_ORDERS', AuditAction.UPDATE, `Generated invoice ${invoiceNumber} for ${wo.orderNumber}`);
      ApiResponse.success(res, 'Work order invoiced', wo);
    } catch (error) {
      next(error);
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const wo = await workOrderService.addComment(getId(req.params.id), req.body.comment, req.user, req.firmScope);
      ApiResponse.success(res, 'Comment added', wo);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await workOrderService.deleteWorkOrder(getId(req.params.id), req.firmScope);
      await logAudit(req, 'WORK_ORDERS', AuditAction.DELETE, `Deleted work order ID ${req.params.id}`);
      ApiResponse.success(res, 'Work order deleted');
    } catch (error) {
      next(error);
    }
  }
}

// --- Users Controller ---
export class UserController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.getUsers(req.query as any);
      ApiResponse.success(res, 'Users list retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.createUser(req.body, req.user?._id.toString());
      await logAudit(req, 'USERS', AuditAction.CREATE, `Created user ${result.user.email}`, result.user._id.toString());
      ApiResponse.created(res, 'User created successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateUser(getId(req.params.id), req.body);
      await logAudit(req, 'USERS', AuditAction.UPDATE, `Updated user ${user.email}`, user._id.toString());
      ApiResponse.success(res, 'User updated', user);
    } catch (error) {
      next(error);
    }
  }

  static async toggleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.toggleUserStatus(getId(req.params.id));
      await logAudit(req, 'USERS', AuditAction.UPDATE, `Toggled active status for ${user.email} to ${user.isActive}`);
      ApiResponse.success(res, `User ${user.isActive ? 'activated' : 'deactivated'}`, user);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.resetUserPassword(getId(req.params.id));
      await logAudit(req, 'USERS', AuditAction.PASSWORD_CHANGE, `Generated temporary password for user ID ${req.params.id}`);
      ApiResponse.success(res, 'Temporary password generated and emailed to user', result);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(getId(req.params.id));
      await logAudit(req, 'USERS', AuditAction.DELETE, `Deleted user ID ${req.params.id}`);
      ApiResponse.success(res, 'User deleted');
    } catch (error) {
      next(error);
    }
  }
}

// --- Dashboard Controller ---
export class DashboardController {
  static async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await dashboardService.getDashboardMetrics(req.firmScope);
      ApiResponse.success(res, 'Dashboard metrics retrieved', metrics);
    } catch (error) {
      next(error);
    }
  }
}
