export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  VIEWER = 'Viewer',
}

export enum TenderStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  AWARDED = 'Awarded',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled',
}

export enum WorkOrderStatus {
  DRAFT = 'Draft',
  ASSIGNED = 'Assigned',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  INVOICED = 'Invoiced',
}

export enum VehicleStatus {
  ACTIVE = 'Active',
  MAINTENANCE = 'Maintenance',
  INACTIVE = 'Inactive',
  DOCUMENT_EXPIRED = 'Document Expired',
}

export enum FuelType {
  DIESEL = 'Diesel',
  PETROL = 'Petrol',
  CNG = 'CNG',
  ELECTRIC = 'Electric',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  OTP_GENERATE = 'OTP_GENERATE',
  OTP_VERIFY = 'OTP_VERIFY',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationType {
  EXPIRY_ALERT = 'expiry_alert',
  TENDER_DEADLINE = 'tender_deadline',
  WORK_ORDER_ASSIGNED = 'work_order_assigned',
  SYSTEM = 'system',
  IMPORT_COMPLETED = 'import_completed',
}
