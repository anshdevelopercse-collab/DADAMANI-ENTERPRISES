import { z } from 'zod';
import { TenderStatus, VehicleStatus, FuelType, WorkOrderStatus } from '../constants/status.constant.js';

export const TenderCreateSchema = z.object({
  tenderNumber: z.string().min(3, 'Tender number is required'),
  title: z.string().min(3, 'Title is required'),
  clientName: z.string().min(2, 'Client name is required'),
  clientDepartment: z.string().optional(),
  category: z.enum(['Logistics', 'Mining', 'Construction', 'Transport', 'Infrastructure', 'Government Supplies', 'Other']).default('Logistics'),
  estimatedValue: z.number().min(0, 'Estimated value must be non-negative'),
  earnestMoneyDeposit: z.number().min(0).optional(),
  submissionDeadline: z.string().or(z.date()),
  openingDate: z.string().or(z.date()).optional(),
  status: z.enum([TenderStatus.DRAFT, TenderStatus.SUBMITTED, TenderStatus.AWARDED, TenderStatus.REJECTED, TenderStatus.CANCELLED]).default(TenderStatus.DRAFT),
  location: z.string().min(2, 'Location is required'),
  state: z.string().optional(),
  scopeOfWork: z.string().optional(),
  assignedManager: z.string().optional(),
  entity: z.string().optional(),
});

export const AwardedTenderCreateSchema = z.object({
  tender: z.string().min(1, 'Tender ID is required'),
  tenderNumber: z.string().min(1),
  clientName: z.string().min(1),
  title: z.string().min(1),
  awardValue: z.number().min(0),
  estimatedCost: z.number().min(0),
  awardedDate: z.string().or(z.date()),
  startDate: z.string().or(z.date()),
  completionDeadline: z.string().or(z.date()),
  contractNumber: z.string().min(1, 'Contract number is required'),
  vendorPartners: z.array(z.string()).optional(),
  executionStatus: z.enum(['Pending Kickoff', 'In Progress', 'On Track', 'Delayed', 'Completed']).default('In Progress'),
  notes: z.string().optional(),
});

const ComplianceDocValidator = z.object({
  documentNumber: z.string().optional().default(''),
  issueDate: z.string().or(z.date()).optional(),
  expiryDate: z.string().or(z.date()),
  fileUrl: z.string().optional(),
});

export const VehicleCreateSchema = z.object({
  registrationNumber: z.string().min(3, 'Registration number is required'),
  chassisNumber: z.string().min(3, 'Chassis number is required'),
  engineNumber: z.string().min(3, 'Engine number is required'),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  yearOfManufacture: z.number().min(1980).max(2030),
  vehicleType: z.enum(['Dumper / Tipper', 'Truck 10-Wheeler', 'Trailer', 'Excavator', 'Bulldozer', 'Water Tanker', 'Transit Mixer', 'Pickup', 'Light Commercial', 'Other']),
  fuelType: z.enum([FuelType.DIESEL, FuelType.PETROL, FuelType.CNG, FuelType.ELECTRIC]),
  capacityTonnes: z.number().min(0),
  odometerKm: z.number().min(0).optional().default(0),
  status: z.enum([VehicleStatus.ACTIVE, VehicleStatus.MAINTENANCE, VehicleStatus.INACTIVE, VehicleStatus.DOCUMENT_EXPIRED]).default(VehicleStatus.ACTIVE),
  currentLocation: z.string().min(2, 'Current location is required'),
  assignedDriver: z.string().optional(),
  assignedProject: z.string().optional(),
  insurance: ComplianceDocValidator,
  fitness: ComplianceDocValidator,
  permit: ComplianceDocValidator,
  tax: ComplianceDocValidator,
  puc: ComplianceDocValidator,
  notes: z.string().optional(),
});

export const WorkOrderCreateSchema = z.object({
  orderNumber: z.string().min(2, 'Work order number is required'),
  title: z.string().min(3, 'Title is required'),
  clientName: z.string().min(2, 'Client name is required'),
  relatedTender: z.string().optional(),
  assignedProject: z.string().min(2, 'Project is required'),
  siteLocation: z.string().min(2, 'Site location is required'),
  assignedManager: z.string().min(1, 'Assigned manager is required'),
  assignedVehicles: z.array(z.string()).optional(),
  assignedDrivers: z.array(z.string()).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).default('Medium'),
  startDate: z.string().or(z.date()),
  targetEndDate: z.string().or(z.date()),
  status: z.enum([WorkOrderStatus.DRAFT, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED, WorkOrderStatus.INVOICED]).default(WorkOrderStatus.ASSIGNED),
  contractValue: z.number().min(0),
  scopeDetails: z.string().optional(),
  progressPercentage: z.number().min(0).max(100).default(0),
});

// --- Vehicle Allocation ---
export const VehicleAllocationCreateSchema = z.object({
  workOrder: z.string().min(1, 'Work order ID is required'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
});
