export interface FirmRef {
  _id: string;
  name: string;
  code: string;
  isPrimary?: boolean;
}

/** A firm field on a document — either a populated object or a bare ID string. */
export type FirmField = FirmRef | string;

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  firmAccessMode?: 'All' | 'Restricted';
  firmAccess?: (FirmRef | string)[];
  customPermissions?: string[];
  // Full effective permission set computed server-side (see backend
  // utils/permissions.util.ts) — this is what the UI actually gates on now;
  // the server still re-checks every request regardless (see requirePermission).
  permissions?: string[];
  phone?: string;
  avatar?: string;
  department?: string;
  designation?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  requiresOtp: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
  error?: {
    code: string;
    details?: any;
  };
}

export interface Tender {
  _id: string;
  firm?: FirmField;
  tenderNumber: string;
  title: string;
  clientName: string;
  clientDepartment?: string;
  category: string;
  estimatedValue: number;
  earnestMoneyDeposit?: number;
  submissionDeadline: string;
  openingDate?: string;
  status: 'Draft' | 'Submitted' | 'Awarded' | 'Rejected' | 'Cancelled';
  location: string;
  state?: string;
  scopeOfWork?: string;
  assignedManager?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  comments?: {
    _id?: string;
    userName: string;
    userRole: string;
    comment: string;
    createdAt: string;
  }[];
  timeline?: {
    action: string;
    performerName: string;
    details?: string;
    timestamp: string;
  }[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AwardedTender {
  _id: string;
  firm?: FirmField;
  tender: Tender | string;
  tenderNumber: string;
  clientName: string;
  title: string;
  awardValue: number;
  estimatedCost: number;
  projectedProfit: number;
  profitMarginPercent: number;
  awardedDate: string;
  startDate: string;
  completionDeadline: string;
  contractNumber: string;
  vendorPartners?: string[];
  executionStatus: 'Pending Kickoff' | 'In Progress' | 'On Track' | 'Delayed' | 'Completed';
  approvalStatus: 'Pending Review' | 'Approved' | 'Rejected';
  approvedBy?: {
    name: string;
    email: string;
  };
  milestones?: {
    _id?: string;
    title: string;
    targetDate: string;
    completedDate?: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    billingAmount?: number;
  }[];
  notes?: string;
  createdAt: string;
}

export interface VehicleComplianceDoc {
  documentNumber: string;
  issueDate?: string;
  expiryDate: string;
  fileUrl?: string;
  isExpired?: boolean;
}

export interface MaintenanceRecord {
  _id?: string;
  serviceDate: string;
  odometerReading: number;
  serviceType: string;
  cost: number;
  serviceCenter: string;
  remarks?: string;
}

export interface Vehicle {
  _id: string;
  ownerFirm?: FirmField;
  registrationNumber: string;
  chassisNumber: string;
  engineNumber: string;
  make: string;
  model: string;
  yearOfManufacture: number;
  vehicleType: string;
  fuelType: string;
  capacityTonnes: number;
  odometerKm: number;
  status: 'Active' | 'Maintenance' | 'Inactive' | 'Document Expired';
  currentLocation: string;
  assignedDriver?: {
    _id: string;
    name: string;
    licenseNumber: string;
    phone: string;
  };
  assignedProject?: string;
  insurance: VehicleComplianceDoc;
  fitness: VehicleComplianceDoc;
  permit: VehicleComplianceDoc;
  tax: VehicleComplianceDoc;
  puc: VehicleComplianceDoc;
  maintenanceHistory?: MaintenanceRecord[];
  notes?: string;
  createdAt: string;
}

export interface Driver {
  _id: string;
  name: string;
  licenseNumber: string;
  licenseExpiry: string;
  phone: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  experienceYears?: number;
  rating?: number;
  assignedVehicle?: {
    _id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
}

export interface WorkOrder {
  _id: string;
  firm?: FirmField;
  orderNumber: string;
  title: string;
  clientName: string;
  relatedTender?: {
    _id: string;
    tenderNumber: string;
    title: string;
  };
  assignedProject: string;
  siteLocation: string;
  assignedManager: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assignedVehicles?: {
    _id: string;
    registrationNumber: string;
    make: string;
    model: string;
    capacityTonnes: number;
  }[];
  assignedDrivers?: {
    _id: string;
    name: string;
    phone: string;
  }[];
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  status: 'Draft' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled' | 'Invoiced';
  contractValue: number;
  invoicedAmount?: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceStatus?: 'Not Invoiced' | 'Draft' | 'Sent' | 'Paid' | 'Partially Paid';
  scopeDetails?: string;
  progressPercentage: number;
  milestones?: {
    _id?: string;
    title: string;
    targetDate: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    progressPercentage: number;
  }[];
  comments?: {
    userName: string;
    comment: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DocumentItem {
  _id: string;
  firms?: (FirmRef | string)[];
  title: string;
  folder: string;
  category: string;
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  mimeType: string;
  uploaderName?: string;
  tags?: string[];
  entityType?: string;
  parentDoc?: string;
  versionNumber?: number;
  isLatestVersion?: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  userName: string;
  userRole: string;
  userEmail: string;
  action: string;
  module: string;
  description: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: string;
}

export interface SystemSettings {
  companyName: string;
  companyTagline?: string;
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
}

// --- Workforce (generic personnel: Driver/Operator/Mechanic/Supervisor/Other) ---
export interface Workforce {
  _id: string;
  name: string;
  type: 'Driver' | 'Operator' | 'Mechanic' | 'Supervisor' | 'Other';
  firm?: FirmField;
  entity?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  licenseNumber?: string;
  licenseExpiry?: string;
  experienceYears?: number;
  rating?: number;
  notes?: string;
  createdAt: string;
}

export interface WorkforceAllocation {
  _id: string;
  workforce: string;
  workOrder: { _id: string; orderNumber: string; title: string; clientName: string; status: string } | string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Ended';
  assignedBy: { _id: string; name: string; email: string } | string;
  notes?: string;
  createdAt: string;
}

// --- Vehicle Allocation (double-booking guard / history) ---
export interface VehicleAllocation {
  _id: string;
  vehicle: string;
  workOrder: { _id: string; orderNumber: string; title: string; clientName: string; status: string } | string;
  startDate: string;
  endDate?: string;
  status: 'Scheduled' | 'Active' | 'Ended' | 'Cancelled';
  assignedBy: { _id: string; name: string; email: string } | string;
  notes?: string;
  createdAt: string;
}

// --- Finance ---
export interface Invoice {
  _id: string;
  entity?: string;
  workOrder: { _id: string; orderNumber: string; title: string; clientName: string } | string;
  vehicle?: { _id: string; registrationNumber: string } | string;
  billingMonth: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  totalAdjusted: number;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export interface ContractAdvance {
  _id: string;
  workOrder: { _id: string; orderNumber: string; title: string; clientName: string } | string;
  recipientType: 'Workforce' | 'User' | 'External';
  recipientRef?: string;
  recipientName: string;
  amount: number;
  date: string;
  reason: string;
  totalAdjusted: number;
  createdAt: string;
}

export interface AdvanceAdjustment {
  _id: string;
  advance: string;
  invoice: { _id: string; invoiceNumber: string; amount: number; billingMonth: string } | string;
  amountAdjusted: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Company {
  _id: string;
  name: string;
  code: string;
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: string;
}

export interface GemFee {
  _id: string;
  entity?: string;
  workOrder: { _id: string; orderNumber: string; title: string; clientName: string } | string;
  tenderRef?: { _id: string; tenderNumber: string; title: string } | string;
  feeType: string;
  ratePercent?: number;
  amount: number;
  paymentDate: string;
  description?: string;
  createdAt: string;
}
