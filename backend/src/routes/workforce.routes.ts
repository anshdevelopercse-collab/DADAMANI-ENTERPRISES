import { Router } from 'express';
import { WorkforceController } from '../controllers/workforce.controller.js';
import { authenticateJwt, requirePermission, validateBody } from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';
import { WorkforceCreateSchema, WorkforceAssignSchema } from '../validators/workforce.validator.js';

export const workforceRouter = Router();
workforceRouter.use(authenticateJwt);

workforceRouter.get('/', requirePermission(PERMISSIONS.WORKFORCE_READ), WorkforceController.list);
workforceRouter.get('/:id', requirePermission(PERMISSIONS.WORKFORCE_READ), WorkforceController.getById);
workforceRouter.post('/', requirePermission(PERMISSIONS.WORKFORCE_CREATE), validateBody(WorkforceCreateSchema), WorkforceController.create);
workforceRouter.put('/:id', requirePermission(PERMISSIONS.WORKFORCE_UPDATE), WorkforceController.update);
workforceRouter.get('/:id/history', requirePermission(PERMISSIONS.WORKFORCE_READ), WorkforceController.history);
workforceRouter.post('/:id/assign', requirePermission(PERMISSIONS.WORKFORCE_ASSIGN), validateBody(WorkforceAssignSchema), WorkforceController.assign);
workforceRouter.delete('/:id', requirePermission(PERMISSIONS.WORKFORCE_DELETE), WorkforceController.delete);
