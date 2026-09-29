import { Router } from 'express';
import {
  TenderController,
  AwardedTenderController,
  VehicleController,
  WorkOrderController,
  UserController,
  DashboardController,
} from '../controllers/operation.controller.js';
import { VehicleAllocationController } from '../controllers/vehicle-allocation.controller.js';
import {
  authenticateJwt,
  requirePermission,
  requireRoles,
  validateBody,
  resolveFirmScope,
} from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';
import { UserRole } from '../constants/status.constant.js';
import {
  TenderCreateSchema,
  AwardedTenderCreateSchema,
  VehicleCreateSchema,
  WorkOrderCreateSchema,
  VehicleAllocationCreateSchema,
} from '../validators/operation.validator.js';
import {
  CreateUserSchema,
  UpdateUserSchema,
} from '../validators/auth.validator.js';

// --- Dashboard Routes ---
export const dashboardRouter = Router();
dashboardRouter.use(authenticateJwt);
dashboardRouter.use(resolveFirmScope);
dashboardRouter.get('/metrics', DashboardController.getMetrics);

// --- Tenders Routes ---
export const tenderRouter = Router();
tenderRouter.use(authenticateJwt);
tenderRouter.use(resolveFirmScope);
tenderRouter.get('/', requirePermission(PERMISSIONS.TENDER_READ), TenderController.list);
tenderRouter.get('/:id', requirePermission(PERMISSIONS.TENDER_READ), TenderController.getById);
tenderRouter.post('/', requirePermission(PERMISSIONS.TENDER_CREATE), validateBody(TenderCreateSchema), TenderController.create);
tenderRouter.put('/:id', requirePermission(PERMISSIONS.TENDER_UPDATE), TenderController.update);
tenderRouter.post('/:id/comments', requirePermission(PERMISSIONS.TENDER_UPDATE), TenderController.addComment);
tenderRouter.patch('/:id/archive', requirePermission(PERMISSIONS.TENDER_ARCHIVE), TenderController.archive);
tenderRouter.patch('/:id/restore', requirePermission(PERMISSIONS.TENDER_ARCHIVE), TenderController.restore);
tenderRouter.delete('/:id', requirePermission(PERMISSIONS.TENDER_DELETE), TenderController.delete);

// --- Awarded Tenders Routes ---
export const awardedRouter = Router();
awardedRouter.use(authenticateJwt);
awardedRouter.use(resolveFirmScope);
awardedRouter.get('/', requirePermission(PERMISSIONS.AWARDED_READ), AwardedTenderController.list);
awardedRouter.get('/:id', requirePermission(PERMISSIONS.AWARDED_READ), AwardedTenderController.getById);
awardedRouter.post('/', requirePermission(PERMISSIONS.AWARDED_CREATE), validateBody(AwardedTenderCreateSchema), AwardedTenderController.create);
awardedRouter.put('/:id', requirePermission(PERMISSIONS.AWARDED_UPDATE), AwardedTenderController.update);
awardedRouter.patch('/:id/approve', requirePermission(PERMISSIONS.AWARDED_APPROVE), AwardedTenderController.approve);
awardedRouter.delete('/:id', requirePermission(PERMISSIONS.AWARDED_DELETE), AwardedTenderController.delete);

// --- Vehicles & Drivers Routes ---
export const vehicleRouter = Router();
vehicleRouter.use(authenticateJwt);
vehicleRouter.use(resolveFirmScope);
vehicleRouter.get('/compliance/alerts', requirePermission(PERMISSIONS.VEHICLE_READ), VehicleController.getComplianceAlerts);
vehicleRouter.get('/drivers/list', requirePermission(PERMISSIONS.VEHICLE_READ), VehicleController.listDrivers);
vehicleRouter.post('/drivers/create', requirePermission(PERMISSIONS.VEHICLE_ASSIGN), VehicleController.createDriver);
vehicleRouter.get('/', requirePermission(PERMISSIONS.VEHICLE_READ), VehicleController.list);
vehicleRouter.get('/:id', requirePermission(PERMISSIONS.VEHICLE_READ), VehicleController.getById);
vehicleRouter.post('/', requirePermission(PERMISSIONS.VEHICLE_CREATE), validateBody(VehicleCreateSchema), VehicleController.create);
vehicleRouter.put('/:id', requirePermission(PERMISSIONS.VEHICLE_UPDATE), VehicleController.update);
vehicleRouter.post('/:id/maintenance', requirePermission(PERMISSIONS.VEHICLE_UPDATE), VehicleController.addMaintenance);
vehicleRouter.get('/:id/allocations', requirePermission(PERMISSIONS.VEHICLE_ALLOCATION_READ), VehicleAllocationController.history);
vehicleRouter.post('/:id/allocations', requirePermission(PERMISSIONS.VEHICLE_ALLOCATION_CREATE), validateBody(VehicleAllocationCreateSchema), VehicleAllocationController.allocate);
vehicleRouter.patch('/allocations/:allocationId/end', requirePermission(PERMISSIONS.VEHICLE_ALLOCATION_END), VehicleAllocationController.end);
vehicleRouter.delete('/:id', requirePermission(PERMISSIONS.VEHICLE_DELETE), VehicleController.delete);

// --- Work Orders Routes ---
export const workOrderRouter = Router();
workOrderRouter.use(authenticateJwt);
workOrderRouter.use(resolveFirmScope);
workOrderRouter.get('/', requirePermission(PERMISSIONS.WORK_ORDER_READ), WorkOrderController.list);
workOrderRouter.get('/:id', requirePermission(PERMISSIONS.WORK_ORDER_READ), WorkOrderController.getById);
workOrderRouter.post('/', requirePermission(PERMISSIONS.WORK_ORDER_CREATE), validateBody(WorkOrderCreateSchema), WorkOrderController.create);
workOrderRouter.put('/:id', requirePermission(PERMISSIONS.WORK_ORDER_UPDATE), WorkOrderController.update);
workOrderRouter.patch('/:id/milestones', requirePermission(PERMISSIONS.WORK_ORDER_UPDATE), WorkOrderController.updateMilestone);
workOrderRouter.post('/:id/invoice', requirePermission(PERMISSIONS.WORK_ORDER_INVOICE), WorkOrderController.invoice);
workOrderRouter.post('/:id/comments', requirePermission(PERMISSIONS.WORK_ORDER_UPDATE), WorkOrderController.addComment);
workOrderRouter.delete('/:id', requirePermission(PERMISSIONS.WORK_ORDER_DELETE), WorkOrderController.delete);

// --- Users Management Routes ---
export const userRouter = Router();
userRouter.use(authenticateJwt);
userRouter.get('/', requirePermission(PERMISSIONS.USER_READ), UserController.list);
userRouter.post('/', requirePermission(PERMISSIONS.USER_CREATE), validateBody(CreateUserSchema), UserController.create);
userRouter.put('/:id', requirePermission(PERMISSIONS.USER_UPDATE), validateBody(UpdateUserSchema), UserController.update);
userRouter.patch('/:id/toggle-status', requirePermission(PERMISSIONS.USER_UPDATE), UserController.toggleStatus);
userRouter.post('/:id/reset-password', requirePermission(PERMISSIONS.USER_UPDATE), UserController.resetPassword);
userRouter.delete('/:id', requireRoles(UserRole.ADMIN), UserController.delete);
