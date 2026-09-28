export const PERMISSIONS = {
  // Tenders
  TENDER_READ: 'tender:read',
  TENDER_CREATE: 'tender:create',
  TENDER_UPDATE: 'tender:update',
  TENDER_DELETE: 'tender:delete',
  TENDER_ARCHIVE: 'tender:archive',
  TENDER_EXPORT: 'tender:export',

  // Awarded Tenders
  AWARDED_READ: 'awarded:read',
  AWARDED_CREATE: 'awarded:create',
  AWARDED_UPDATE: 'awarded:update',
  AWARDED_DELETE: 'awarded:delete',
  AWARDED_APPROVE: 'awarded:approve',

  // Vehicles
  VEHICLE_READ: 'vehicle:read',
  VEHICLE_CREATE: 'vehicle:create',
  VEHICLE_UPDATE: 'vehicle:update',
  VEHICLE_DELETE: 'vehicle:delete',
  VEHICLE_ASSIGN: 'vehicle:assign',
  VEHICLE_EXPORT: 'vehicle:export',

  // Work Orders
  WORK_ORDER_READ: 'work_order:read',
  WORK_ORDER_CREATE: 'work_order:create',
  WORK_ORDER_UPDATE: 'work_order:update',
  WORK_ORDER_DELETE: 'work_order:delete',
  WORK_ORDER_INVOICE: 'work_order:invoice',

  // Users & Roles
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  ROLE_MANAGE: 'role:manage',

  // Import / Export
  IMPORT_DATA: 'import:data',
  EXPORT_DATA: 'export:data',

  // Documents
  DOCUMENT_READ: 'document:read',
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_DELETE: 'document:delete',

  // Audit Logs
  AUDIT_READ: 'audit:read',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',

  // Vehicle Allocation (double-booking guard / history)
  VEHICLE_ALLOCATION_READ: 'vehicle_allocation:read',
  VEHICLE_ALLOCATION_CREATE: 'vehicle_allocation:create',
  VEHICLE_ALLOCATION_END: 'vehicle_allocation:end',

  // Workforce (generic personnel — Driver, Operator, Mechanic, Supervisor, Other)
  WORKFORCE_READ: 'workforce:read',
  WORKFORCE_CREATE: 'workforce:create',
  WORKFORCE_UPDATE: 'workforce:update',
  WORKFORCE_DELETE: 'workforce:delete',
  WORKFORCE_ASSIGN: 'workforce:assign',

  // Finance — Invoices
  INVOICE_READ: 'invoice:read',
  INVOICE_CREATE: 'invoice:create',
  INVOICE_UPDATE: 'invoice:update',
  INVOICE_DELETE: 'invoice:delete',

  // Finance — Contract Advances
  ADVANCE_READ: 'advance:read',
  ADVANCE_CREATE: 'advance:create',
  ADVANCE_ADJUST: 'advance:adjust',
  ADVANCE_DELETE: 'advance:delete',

  // Finance — GEM Portal Fees
  GEMFEE_READ: 'gemfee:read',
  GEMFEE_CREATE: 'gemfee:create',
  GEMFEE_DELETE: 'gemfee:delete',

  // Companies / Entities (schema ready; module gated until entity data is approved)
  COMPANY_READ: 'company:read',
  COMPANY_MANAGE: 'company:manage',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: Object.values(PERMISSIONS),
  Manager: [
    PERMISSIONS.TENDER_READ,
    PERMISSIONS.TENDER_CREATE,
    PERMISSIONS.TENDER_UPDATE,
    PERMISSIONS.TENDER_EXPORT,
    PERMISSIONS.AWARDED_READ,
    PERMISSIONS.AWARDED_CREATE,
    PERMISSIONS.AWARDED_UPDATE,
    PERMISSIONS.VEHICLE_READ,
    PERMISSIONS.VEHICLE_CREATE,
    PERMISSIONS.VEHICLE_UPDATE,
    PERMISSIONS.VEHICLE_ASSIGN,
    PERMISSIONS.VEHICLE_EXPORT,
    PERMISSIONS.WORK_ORDER_READ,
    PERMISSIONS.WORK_ORDER_CREATE,
    PERMISSIONS.WORK_ORDER_UPDATE,
    PERMISSIONS.WORK_ORDER_INVOICE,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.VEHICLE_ALLOCATION_READ,
    PERMISSIONS.VEHICLE_ALLOCATION_CREATE,
    PERMISSIONS.VEHICLE_ALLOCATION_END,
    PERMISSIONS.WORKFORCE_READ,
    PERMISSIONS.WORKFORCE_CREATE,
    PERMISSIONS.WORKFORCE_UPDATE,
    PERMISSIONS.WORKFORCE_ASSIGN,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.ADVANCE_READ,
    PERMISSIONS.ADVANCE_CREATE,
    PERMISSIONS.ADVANCE_ADJUST,
    PERMISSIONS.GEMFEE_READ,
    PERMISSIONS.GEMFEE_CREATE,
    PERMISSIONS.COMPANY_READ,
  ],
  Viewer: [
    PERMISSIONS.TENDER_READ,
    PERMISSIONS.AWARDED_READ,
    PERMISSIONS.VEHICLE_READ,
    PERMISSIONS.WORK_ORDER_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VEHICLE_ALLOCATION_READ,
    PERMISSIONS.WORKFORCE_READ,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.ADVANCE_READ,
    PERMISSIONS.GEMFEE_READ,
    PERMISSIONS.COMPANY_READ,
  ],
};
