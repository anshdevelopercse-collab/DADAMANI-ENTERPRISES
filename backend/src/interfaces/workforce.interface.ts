import { Document, Types } from 'mongoose';

export type WorkforceType = 'Driver' | 'Operator' | 'Mechanic' | 'Supervisor' | 'Other';
export type WorkforceStatus = 'Active' | 'On Leave' | 'Terminated';
export type WorkforceAllocationStatus = 'Active' | 'Ended';

export interface IWorkforce {
  name: string;
  type: WorkforceType;
  // Optional until entity backfill is approved (see architecture doc) — never
  // required yet, and the cross-entity assignment guard below is a no-op
  // whenever either side of the comparison is unset.
  entity?: Types.ObjectId;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  status: WorkforceStatus;
  // Driver-specific fields, optional/conditional on type — kept here rather
  // than in a discriminator so one collection can list "all personnel"
  // without a union type at the query layer.
  licenseNumber?: string;
  licenseExpiry?: Date;
  experienceYears?: number;
  rating?: number;
  // One-time migration back-reference: set when this Workforce record was
  // copied from an existing Driver document, so the two can be reconciled.
  // Driver stays the source of truth for existing driver-only UI until the
  // frontend fully migrates (see architecture doc §8).
  legacyDriverId?: Types.ObjectId;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkforceDocument extends IWorkforce, Document {}

export interface IWorkforceAllocation {
  workforce: Types.ObjectId;
  workOrder: Types.ObjectId;
  startDate: Date;
  endDate?: Date | null;
  status: WorkforceAllocationStatus;
  assignedBy: Types.ObjectId;
  endedBy?: Types.ObjectId;
  endedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkforceAllocationDocument extends IWorkforceAllocation, Document {}
