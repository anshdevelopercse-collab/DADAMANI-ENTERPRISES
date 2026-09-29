import { Document, Types } from 'mongoose';
import { TenderStatus } from '../constants/status.constant.js';

export interface ITenderComment {
  user: Types.ObjectId;
  userName: string;
  userRole: string;
  comment: string;
  createdAt: Date;
}

export interface ITenderAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface ITenderTimelineEvent {
  action: string;
  performedBy: Types.ObjectId;
  performerName: string;
  details?: string;
  timestamp: Date;
}

export interface ITender {
  entity?: Types.ObjectId;
  tenderNumber: string;
  title: string;
  clientName: string;
  clientDepartment?: string;
  category: 'Logistics' | 'Mining' | 'Construction' | 'Transport' | 'Infrastructure' | 'Government Supplies' | 'Other';
  estimatedValue: number;
  earnestMoneyDeposit?: number; // EMD
  submissionDeadline: Date;
  openingDate?: Date;
  status: TenderStatus;
  location: string;
  state?: string;
  scopeOfWork?: string;
  assignedManager?: Types.ObjectId;
  attachments?: ITenderAttachment[];
  comments?: ITenderComment[];
  timeline?: ITenderTimelineEvent[];
  isArchived: boolean;
  archivedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenderDocument extends ITender, Document {}

export interface IAwardedTender {
  entity?: Types.ObjectId;
  tender: Types.ObjectId;
  tenderNumber: string;
  clientName: string;
  title: string;
  awardValue: number;
  estimatedCost: number;
  projectedProfit: number;
  profitMarginPercent: number;
  awardedDate: Date;
  startDate: Date;
  completionDeadline: Date;
  contractNumber: string;
  vendorPartners?: string[];
  executionStatus: 'Pending Kickoff' | 'In Progress' | 'On Track' | 'Delayed' | 'Completed';
  approvalStatus: 'Pending Review' | 'Approved' | 'Rejected';
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  milestones?: {
    title: string;
    targetDate: Date;
    completedDate?: Date;
    status: 'Pending' | 'In Progress' | 'Completed';
    billingAmount?: number;
  }[];
  documents?: ITenderAttachment[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAwardedTenderDocument extends IAwardedTender, Document {}
