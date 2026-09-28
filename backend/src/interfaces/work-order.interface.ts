import { Document, Types } from 'mongoose';
import { WorkOrderStatus } from '../constants/status.constant.js';

export interface IWorkOrderMilestone {
  title: string;
  description?: string;
  targetDate: Date;
  status: 'Pending' | 'In Progress' | 'Completed';
  completedAt?: Date;
  progressPercentage: number;
}

export interface IWorkOrder {
  orderNumber: string; // e.g. WO-2026-001
  title: string;
  clientName: string;
  // Optional until entity backfill is approved — never required yet.
  entity?: Types.ObjectId;
  relatedTender?: Types.ObjectId;
  assignedProject: string;
  siteLocation: string;
  assignedManager: Types.ObjectId;
  assignedVehicles?: Types.ObjectId[];
  assignedDrivers?: Types.ObjectId[];
  assignedWorkforce?: Types.ObjectId[];
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  startDate: Date;
  targetEndDate: Date;
  actualEndDate?: Date;
  status: WorkOrderStatus;
  contractValue: number;
  invoicedAmount?: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceStatus?: 'Not Invoiced' | 'Draft' | 'Sent' | 'Paid' | 'Partially Paid';
  scopeDetails?: string;
  progressPercentage: number;
  milestones?: IWorkOrderMilestone[];
  comments?: {
    user: Types.ObjectId;
    userName: string;
    comment: string;
    createdAt: Date;
  }[];
  attachments?: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkOrderDocument extends IWorkOrder, Document {}
