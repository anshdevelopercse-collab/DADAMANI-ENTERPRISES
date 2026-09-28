import { Document, Types } from 'mongoose';

/**
 * Lifecycle of a single vehicle <-> work order (contract) allocation.
 * Scheduled = booked for a future window, not yet in effect.
 * Active     = currently in effect.
 * Ended      = ran its course / was closed out normally.
 * Cancelled  = withdrawn before or without ever taking effect.
 *
 * Double-booking protection only ever needs to look at Scheduled + Active
 * rows: those are the ones that occupy time on the vehicle's calendar.
 */
export type VehicleAllocationStatus = 'Scheduled' | 'Active' | 'Ended' | 'Cancelled';

export const OPEN_ENDED_ALLOCATIONS: VehicleAllocationStatus[] = ['Scheduled', 'Active'];

export interface IVehicleAllocation {
  vehicle: Types.ObjectId;
  workOrder: Types.ObjectId;
  startDate: Date;
  endDate?: Date | null;
  status: VehicleAllocationStatus;
  assignedBy: Types.ObjectId;
  endedBy?: Types.ObjectId;
  endedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicleAllocationDocument extends IVehicleAllocation, Document {}

export interface IDateRange {
  start: Date;
  end?: Date | null;
}
