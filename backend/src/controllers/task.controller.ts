import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { TaskService } from '../services/task.service.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction, UserRole } from '../constants/status.constant.js';

const taskService = new TaskService();
const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));
const isAdmin = (req: AuthenticatedRequest) => req.user?.role === UserRole.ADMIN;

export class TaskController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scope = (req.query.scope as string) || 'mine';
      const tasks = await taskService.getTasks(req.user!._id.toString(), scope);
      ApiResponse.success(res, 'Tasks retrieved', tasks);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.getById(getId(req.params.id), req.user!._id.toString(), isAdmin(req));
      ApiResponse.success(res, 'Task retrieved', task);
    } catch (error) {
      next(error);
    }
  }

  static async createPersonal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.createPersonalTask(req.body, req.user!._id.toString());
      await logAudit(req, 'TASKS', AuditAction.CREATE, `Created personal task: ${task.title}`, task._id.toString());
      ApiResponse.created(res, 'Task created', task);
    } catch (error) {
      next(error);
    }
  }

  static async assignTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.assignTask(req.body, req.user!._id.toString());
      await logAudit(req, 'TASKS', AuditAction.CREATE, `Admin assigned task "${task.title}" to user ${req.body.assignedTo}`, task._id.toString());
      ApiResponse.created(res, 'Task assigned', task);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.updateTask(getId(req.params.id), req.body, req.user!._id.toString(), isAdmin(req));
      await logAudit(req, 'TASKS', AuditAction.UPDATE, `Updated task: ${task.title}`, task._id.toString());
      ApiResponse.success(res, 'Task updated', task);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      await taskService.deleteTask(id, req.user!._id.toString(), isAdmin(req));
      await logAudit(req, 'TASKS', AuditAction.DELETE, `Deleted task ${id}`, id);
      ApiResponse.success(res, 'Task deleted');
    } catch (error) {
      next(error);
    }
  }

  static async addChecklistItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.addChecklistItem(getId(req.params.id), req.body, req.user!._id.toString(), isAdmin(req));
      ApiResponse.created(res, 'Checklist item added', task);
    } catch (error) {
      next(error);
    }
  }

  static async updateChecklistItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.updateChecklistItem(
        getId(req.params.id),
        getId(req.params.itemId),
        req.body,
        req.user!._id.toString(),
        isAdmin(req)
      );
      ApiResponse.success(res, 'Checklist item updated', task);
    } catch (error) {
      next(error);
    }
  }

  static async deleteChecklistItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.deleteChecklistItem(
        getId(req.params.id),
        getId(req.params.itemId),
        req.user!._id.toString(),
        isAdmin(req)
      );
      ApiResponse.success(res, 'Checklist item removed', task);
    } catch (error) {
      next(error);
    }
  }
}
