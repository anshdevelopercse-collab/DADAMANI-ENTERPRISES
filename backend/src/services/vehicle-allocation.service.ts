import mongoose from 'mongoose';
import { VehicleAllocation } from '../models/vehicle-allocation.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import {
  IVehicleAllocationDocument,
  IDateRange,
  OPEN_ENDED_ALLOCATIONS,
} from '../interfaces/vehicle-allocation.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { runInTransaction } from '../utils/transaction.util.js';
import { PaginationParams, PaginatedResult } from '../interfaces/common.interface.js';

/**
 * Pure date-range overlap check — no I/O, no Mongo. Kept standalone so it can
 * be unit tested directly (see tests/vehicle-allocation.test.ts) the same way
 * the rest of this codebase's utils are tested, without needing a database.
 *
 * A missing `end` means "open-ended / ongoing" and is treated as +infinity.
 * Two ranges overlap (including touching at a single instant) whenever
 * neither one entirely precedes the other.
 */
export function rangesOverlap(a: IDateRange, b: IDateRange): boolean {
  const MAX_DATE = new Date(8640000000000000);
  const aEnd = a.end ?? MAX_DATE;
  const bEnd = b.end ?? MAX_DATE;
  return a.start <= bEnd && b.start <= aEnd;
}

export class VehicleDoubleBookingError extends Error {
  constructor(public conflictingAllocation: IVehicleAllocationDocument) {
    super('Vehicle is already allocated to another work order for an overlapping period');
  }
}

export class VehicleAllocationService {
  /**
   * Throws ApiError.conflict if `vehicleId` already has a Scheduled/Active
   * allocation whose window overlaps [startDate, endDate]. Pass
   * `excludeAllocationId` when re-validating an existing allocation (e.g. on
   * update) so it doesn't conflict with itself.
   */
  async assertNoOverlap(
    vehicleId: string,
    startDate: Date | string,
    endDate: Date | string | null | undefined,
    excludeAllocationId?: string,
    session?: mongoose.ClientSession
  ): Promise<void> {
    const filter: any = { vehicle: vehicleId, status: { $in: OPEN_ENDED_ALLOCATIONS } };
    if (excludeAllocationId) filter._id = { $ne: excludeAllocationId };

    const existing = await VehicleAllocation.find(filter).session(session ?? null).exec();
    const candidate: IDateRange = {
      start: new Date(startDate),
      end: endDate ? new Date(endDate) : null,
    };

    for (const allocation of existing) {
      const existingRange: IDateRange = { start: allocation.startDate, end: allocation.endDate };
      if (rangesOverlap(candidate, existingRange)) {
        throw ApiError.conflict(
          `Vehicle is already allocated to Work Order ${allocation.workOrder.toString()} for an overlapping period (${allocation.startDate.toISOString().slice(0, 10)}${allocation.endDate ? ' to ' + allocation.endDate.toISOString().slice(0, 10) : ' onward'}). End that allocation first or adjust the dates.`,
          'RES_003'
        );
      }
    }
  }

  /**
   * Creates a new allocation inside a transaction. Two concurrent calls for
   * the same vehicle will serialize on the `allocationVersion` bump below —
   * whichever transaction commits first wins; the other aborts with a
   * transient-transaction error, is retried by runInTransaction, re-checks
   * overlap against the now-committed row, and correctly fails with a 409
   * instead of both succeeding. This is the actual fix for finding #2 in the
   * architecture doc — not just an application-level check that a race
   * condition could slip past.
   */
  /**
   * Creates a new allocation. If `session` is supplied (e.g. by
   * WorkOrderService creating a work order + its vehicle allocations as one
   * atomic unit), this runs inside that caller-owned transaction instead of
   * starting its own — MongoDB does not support nesting two independent
   * transactions, so composability requires sharing one session.
   */
  async allocate(
    vehicleId: string,
    workOrderId: string,
    startDate: Date | string,
    endDate: Date | string | null | undefined,
    assignedById: string,
    session?: mongoose.ClientSession
  ): Promise<IVehicleAllocationDocument> {
    if (session) {
      return this.allocateWithinSession(vehicleId, workOrderId, startDate, endDate, assignedById, session);
    }
    return runInTransaction((s) => this.allocateWithinSession(vehicleId, workOrderId, startDate, endDate, assignedById, s));
  }

  private async allocateWithinSession(
    vehicleId: string,
    workOrderId: string,
    startDate: Date | string,
    endDate: Date | string | null | undefined,
    assignedById: string,
    session: mongoose.ClientSession
  ): Promise<IVehicleAllocationDocument> {
    const vehicle = await Vehicle.findById(vehicleId).session(session);
    if (!vehicle) throw ApiError.notFound('Vehicle not found');

    // Serialization point: bumping this field inside the transaction means
    // two concurrent transactions touching the same vehicle cannot both
    // commit — MongoDB aborts one as a write conflict, which runInTransaction
    // retries. That retry re-runs assertNoOverlap against the now-committed
    // row, so the second request correctly fails with a 409 instead of both
    // succeeding.
    vehicle.allocationVersion = (vehicle.allocationVersion || 0) + 1;
    await vehicle.save({ session });

    await this.assertNoOverlap(vehicleId, startDate, endDate, undefined, session);

    const [allocation] = await VehicleAllocation.create(
      [
        {
          vehicle: vehicleId,
          workOrder: workOrderId,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          status: 'Active',
          assignedBy: assignedById,
        },
      ],
      { session }
    );
    return allocation;
  }

  async endAllocation(allocationId: string, endedById: string): Promise<IVehicleAllocationDocument> {
    const allocation = await VehicleAllocation.findById(allocationId);
    if (!allocation) throw ApiError.notFound('Allocation not found');
    if (allocation.status === 'Ended' || allocation.status === 'Cancelled') {
      throw ApiError.badRequest('Allocation is already closed');
    }
    allocation.status = 'Ended';
    allocation.endedBy = endedById as any;
    allocation.endedAt = new Date();
    if (!allocation.endDate) allocation.endDate = new Date();
    await allocation.save();
    return allocation;
  }

  /** Ends whichever active/scheduled allocation currently links this vehicle to this work order (used when a vehicle is removed from a WorkOrder's assignedVehicles list). */
  async endActiveAllocationForWorkOrder(vehicleId: string, workOrderId: string, endedById: string): Promise<void> {
    const allocation = await VehicleAllocation.findOne({
      vehicle: vehicleId,
      workOrder: workOrderId,
      status: { $in: OPEN_ENDED_ALLOCATIONS },
    });
    if (allocation) {
      await this.endAllocation(allocation._id.toString(), endedById);
    }
  }

  async getHistoryForVehicle(vehicleId: string, params: PaginationParams = {}): Promise<PaginatedResult<IVehicleAllocationDocument>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { vehicle: vehicleId };
    const [data, total] = await Promise.all([
      VehicleAllocation.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workOrder', 'orderNumber title clientName status')
        .populate('assignedBy', 'name email')
        .exec(),
      VehicleAllocation.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
  }

  async getActiveForWorkOrder(workOrderId: string): Promise<IVehicleAllocationDocument[]> {
    return VehicleAllocation.find({ workOrder: workOrderId, status: { $in: OPEN_ENDED_ALLOCATIONS } })
      .populate('vehicle', 'registrationNumber make model')
      .exec();
  }
}
