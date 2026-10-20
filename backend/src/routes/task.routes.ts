import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { authenticateJwt, requirePermission, validateBody } from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskAssignSchema,
  ChecklistItemUpdateSchema,
} from '../validators/task.validator.js';

export const taskRouter = Router();
taskRouter.use(authenticateJwt);

taskRouter.get('/', requirePermission(PERMISSIONS.TASK_READ), TaskController.list);
taskRouter.get('/:id', requirePermission(PERMISSIONS.TASK_READ), TaskController.getById);

// Personal task creation (Admin + Manager)
taskRouter.post(
  '/',
  requirePermission(PERMISSIONS.TASK_CREATE),
  validateBody(TaskCreateSchema),
  TaskController.createPersonal
);

// Admin-only: assign a task to a Manager
taskRouter.post(
  '/assign',
  requirePermission(PERMISSIONS.TASK_ASSIGN),
  validateBody(TaskCreateSchema.merge(TaskAssignSchema)),
  TaskController.assignTask
);

taskRouter.put('/:id', requirePermission(PERMISSIONS.TASK_UPDATE), validateBody(TaskUpdateSchema), TaskController.update);
taskRouter.delete('/:id', requirePermission(PERMISSIONS.TASK_DELETE), TaskController.delete);

// Checklist sub-resources
taskRouter.post('/:id/checklist', requirePermission(PERMISSIONS.TASK_UPDATE), TaskController.addChecklistItem);
taskRouter.put('/:id/checklist/:itemId', requirePermission(PERMISSIONS.TASK_UPDATE), validateBody(ChecklistItemUpdateSchema), TaskController.updateChecklistItem);
taskRouter.delete('/:id/checklist/:itemId', requirePermission(PERMISSIONS.TASK_UPDATE), TaskController.deleteChecklistItem);
