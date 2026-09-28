import mongoose, { Schema } from 'mongoose';
import { IImportHistoryDocument, IAuditLogDocument, ISettingDocument } from '../interfaces/audit.interface.js';
import { AuditAction } from '../constants/status.constant.js';

// --- Import History ---
const ImportHistorySchema = new Schema<IImportHistoryDocument>(
  {
    fileName: { type: String, required: true },
    module: {
      type: String,
      enum: ['Tenders', 'AwardedTenders', 'Vehicles', 'WorkOrders'],
      required: true,
      index: true,
    },
    totalRows: { type: Number, required: true },
    successfulRows: { type: Number, required: true },
    failedRows: { type: Number, required: true },
    duplicateRows: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Completed', 'Partially Completed', 'Failed'],
      required: true,
    },
    sheetName: { type: String, required: true },
    importedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    errorLog: [
      {
        rowNumber: { type: Number },
        data: { type: Schema.Types.Mixed },
        errors: [{ type: String }],
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ImportHistory = mongoose.model<IImportHistoryDocument>('ImportHistory', ImportHistorySchema);

// --- Audit Log ---
const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String },
    userRole: { type: String },
    userEmail: { type: String },
    action: { type: String, required: true, index: true },
    module: {
      type: String,
      enum: ['AUTH', 'TENDERS', 'AWARDED', 'VEHICLES', 'WORK_ORDERS', 'USERS', 'IMPORT', 'EXPORT', 'DOCUMENTS', 'SETTINGS', 'SYSTEM'],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    entityId: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

// --- System Setting ---
const SettingSchema = new Schema<ISettingDocument>(
  {
    companyName: { type: String, default: 'Dada Mani Enterprise Operations' },
    companyTagline: { type: String, default: 'Heavy Logistics, Mining, Fleet & Infrastructure Operations' },
    companyLogoUrl: { type: String, default: '' },
    companyEmail: { type: String, default: 'operations@dadamani.com' },
    companyPhone: { type: String, default: '+91 98765 43210' },
    companyAddress: { type: String, default: 'Dada Mani Tower, Mining Belt Road, Odisha, India' },
    gstNumber: { type: String, default: '21AAACD1234F1Z5' },
    panNumber: { type: String, default: 'AAACD1234F' },
    currencySymbol: { type: String, default: '₹' },
    defaultTimezone: { type: String, default: 'Asia/Kolkata' },
    alertDaysBeforeExpiry: { type: Number, default: 30 },
    smtpConfig: {
      host: { type: String, default: 'smtp.ethereal.email' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      fromEmail: { type: String, default: 'Dada Mani Operations <no-reply@dadamani.com>' },
    },
    themeConfig: {
      primaryColor: { type: String, default: '#0284c7' },
      secondaryColor: { type: String, default: '#f59e0b' },
      darkModeDefault: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Setting = mongoose.model<ISettingDocument>('Setting', SettingSchema);
