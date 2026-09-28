import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { WorkforceService } from '../services/workforce.service.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const workforceService = new WorkforceService();
const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));

export class WorkforceController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workforceService.getWorkforce(req.query as any);
      ApiResponse.success(res, 'Workforce retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workforce = await workforceService.getById(getId(req.params.id));
      ApiResponse.success(res, 'Workforce member retrieved', workforce);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workforce = await workforceService.create(req.body, req.user?._id.toString()!);
      await logAudit(req, 'VEHICLES', AuditAction.CREATE, `Added workforce member ${workforce.name} (${workforce.type})`, workforce._id.toString());
      ApiResponse.created(res, 'Workforce member created', workforce);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workforce = await workforceService.update(getId(req.params.id), req.body);
      await logAudit(req, 'VEHICLES', AuditAction.UPDATE, `Updated workforce member ${workforce.name}`, workforce._id.toString());
      ApiResponse.success(res, 'Workforce member updated', workforce);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      await workforceService.delete(id);
      await logAudit(req, 'VEHICLES', AuditAction.DELETE, `Deleted workforce member ${id}`, id);
      ApiResponse.success(res, 'Workforce member deleted');
    } catch (error) {
      next(error);
    }
  }

  static async assign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workOrder, notes } = req.body;
      const allocation = await workforceService.assign(getId(req.params.id), workOrder, req.user?._id.toString()!, notes);
      await logAudit(req, 'VEHICLES', AuditAction.UPDATE, `Assigned workforce ${req.params.id} to Work Order ${workOrder}`, allocation._id.toString());
      ApiResponse.created(res, 'Workforce member assigned', allocation);
    } catch (error) {
      next(error);
    }
  }

  static async history(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workforceService.getHistory(getId(req.params.id), req.query as any);
      ApiResponse.success(res, 'Workforce assignment history retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}
