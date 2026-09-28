import { Types } from 'mongoose';
import { VehicleStatus, FuelType } from '../constants/status.constant.js';

export interface IVehicleComplianceDoc {
  documentNumber: string;
  issueDate?: Date;
  expiryDate: Date;
  fileUrl?: string;
  isExpired?: boolean;
}

export interface IVehicleMaintenanceRecord {
  serviceDate: Date;
  odometerReading: number;
  serviceType: string;
  cost: number;
  serviceCenter: string;
  invoiceUrl?: string;
  remarks?: string;
}

export interface IVehicle {
  registrationNumber: string;
  chassisNumber: string;
  engineNumber: string;
  make: string;
  model: string;
  yearOfManufacture: number;
  vehicleType: 'Dumper / Tipper' | 'Truck 10-Wheeler' | 'Trailer' | 'Excavator' | 'Bulldozer' | 'Water Tanker' | 'Transit Mixer' | 'Pickup' | 'Light Commercial' | 'Other';
  fuelType: FuelType;
  capacityTonnes: number;
  odometerKm: number;
  status: VehicleStatus;
  currentLocation: string;
  assignedDriver?: Types.ObjectId;
  assignedProject?: string;

  // Compliance Documents & Expiries
  insurance: IVehicleComplianceDoc;
  fitness: IVehicleComplianceDoc;
  permit: IVehicleComplianceDoc;
  tax: IVehicleComplianceDoc;
  puc: IVehicleComplianceDoc;

  maintenanceHistory?: IVehicleMaintenanceRecord[];
  documents?: {
    name: string;
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  notes?: string;
  createdBy: Types.ObjectId;
  // Optional until entity backfill is approved (see architecture doc) — never required yet.
  homeEntity?: Types.ObjectId;
  allocationVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IVehicleDocument = any;

export interface IDriver {
  name: string;
  licenseNumber: string;
  licenseExpiry: Date;
  phone: string;
  emergencyContact?: string;
  address?: string;
  assignedVehicle?: Types.ObjectId;
  status: 'Active' | 'On Leave' | 'Terminated';
  experienceYears?: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IDriverDocument = any;
