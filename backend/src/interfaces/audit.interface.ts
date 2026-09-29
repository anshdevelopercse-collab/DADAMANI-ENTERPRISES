import { Document, Types } from 'mongoose';
import { AuditAction, NotificationPriority, NotificationType } from '../constants/status.constant.js';

export interface IAuditLog {
  user?: Types.ObjectId;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  action: AuditAction | string;
  module: 'AUTH' | 'TENDERS' | 'AWARDED' | 'VEHICLES' | 'WORK_ORDERS' | 'USERS' | 'IMPORT' | 'EXPORT' | 'DOCUMENTS' | 'SETTINGS' | 'SYSTEM';
  description: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document {}

export interface INotification {
  recipient?: Types.ObjectId; // null = all admins / broadcast
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  link?: string;
  metadata?: any;
  createdAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

export interface IDocumentRecord {
  title: string;
  folder: string; // e.g. Tenders, Vehicles, Work Orders, Invoices, Compliance
  category: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  uploaderName?: string;
  tags?: string[];
  entityType?: 'Tender' | 'Vehicle' | 'WorkOrder' | 'User' | 'Invoice' | 'ContractAdvance' | 'GemFee' | 'Workforce' | 'General';
  entityId?: Types.ObjectId;
  firms?: Types.ObjectId[];
  isArchived: boolean;
  // Version history fields
  parentDoc?: Types.ObjectId; // null = original; non-null = this is a later version
  versionNumber: number;       // 1-based; original starts at 1
  isLatestVersion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentRecordDocument extends IDocumentRecord, Document {}

export interface IImportHistory {
  fileName: string;
  module: 'Tenders' | 'AwardedTenders' | 'Vehicles' | 'WorkOrders';
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  status: 'Completed' | 'Partially Completed' | 'Failed';
  sheetName: string;
  importedBy: Types.ObjectId;
  errorLog?: {
    rowNumber: number;
    data: any;
    errors: string[];
  }[];
  createdAt: Date;
}

export interface IImportHistoryDocument extends IImportHistory, Document {}

export interface ISetting {
  companyName: string;
  companyTagline?: string;
  companyLogoUrl?: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  gstNumber?: string;
  panNumber?: string;
  currencySymbol: string;
  defaultTimezone: string;
  alertDaysBeforeExpiry: number;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromEmail: string;
  };
  themeConfig?: {
    primaryColor: string;
    secondaryColor: string;
    darkModeDefault: boolean;
  };
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

export interface ISettingDocument extends ISetting, Document {}
