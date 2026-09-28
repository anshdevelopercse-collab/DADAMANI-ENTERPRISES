import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { VehicleAllocationService } from '../services/vehicle-allocation.service.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const allocationService = new VehicleAllocationService();
const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));

export class VehicleAllocationController {
  static async history(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await allocationService.getHistoryForVehicle(getId(req.params.id), req.query as any);
      ApiResponse.success(res, 'Vehicle allocation history retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async allocate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = getId(req.params.id);
      const { workOrder, startDate, endDate } = req.body;
      const allocation = await allocationService.allocate(
        vehicleId,
        workOrder,
        startDate,
        endDate,
        req.user?._id.toString()!
      );
      await logAudit(
        req,
        'VEHICLES',
        AuditAction.CREATE,
        `Allocated vehicle ${vehicleId} to Work Order ${workOrder}`,
        allocation._id.toString()
      );
      ApiResponse.created(res, 'Vehicle allocated to work order', allocation);
    } catch (error) {
      next(error);
    }
  }

  static async end(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const allocation = await allocationService.endAllocation(getId(req.params.allocationId), req.user?._id.toString()!);
      await logAudit(req, 'VEHICLES', AuditAction.UPDATE, `Ended vehicle allocation ${allocation._id.toString()}`, allocation._id.toString());
      ApiResponse.success(res, 'Allocation ended', allocation);
    } catch (error) {
      next(error);
    }
  }
}
