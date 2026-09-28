import mongoose, { Schema } from 'mongoose';
import { IVehicleDocument } from '../interfaces/vehicle.interface.js';
import { VehicleStatus, FuelType } from '../constants/status.constant.js';

const ComplianceDocSchema = new Schema(
  {
    documentNumber: { type: String, default: '' },
    issueDate: { type: Date },
    expiryDate: { type: Date, required: true, index: true },
    fileUrl: { type: String },
    isExpired: { type: Boolean, default: false },
  },
  { _id: false }
);

const MaintenanceRecordSchema = new Schema(
  {
    serviceDate: { type: Date, required: true },
    odometerReading: { type: Number, required: true },
    serviceType: { type: String, required: true },
    cost: { type: Number, required: true },
    serviceCenter: { type: String, required: true },
    invoiceUrl: { type: String },
    remarks: { type: String },
  },
  { _id: true }
);

const VehicleSchema = new Schema<IVehicleDocument>(
  {
    registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    chassisNumber: { type: String, required: true, uppercase: true, trim: true },
    engineNumber: { type: String, required: true, uppercase: true, trim: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    yearOfManufacture: { type: Number, required: true },
    vehicleType: {
      type: String,
      enum: ['Dumper / Tipper', 'Truck 10-Wheeler', 'Trailer', 'Excavator', 'Bulldozer', 'Water Tanker', 'Transit Mixer', 'Pickup', 'Light Commercial', 'Other'],
      default: 'Dumper / Tipper',
      index: true,
    },
    fuelType: {
      type: String,
      enum: Object.values(FuelType),
      default: FuelType.DIESEL,
    },
    capacityTonnes: { type: Number, required: true },
    odometerKm: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.ACTIVE,
      index: true,
    },
    currentLocation: { type: String, required: true },
    assignedDriver: { type: Schema.Types.ObjectId, ref: 'Driver' },
    assignedProject: { type: String },

    // Compliance Expiries
    insurance: { type: ComplianceDocSchema, required: true },
    fitness: { type: ComplianceDocSchema, required: true },
    permit: { type: ComplianceDocSchema, required: true },
    tax: { type: ComplianceDocSchema, required: true },
    puc: { type: ComplianceDocSchema, required: true },

    maintenanceHistory: [MaintenanceRecordSchema],
    documents: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Entity/allocation architecture (added, not yet enforced — see architecture doc).
    // Optional until entity backfill is approved; do not make required yet.
    homeEntity: { type: Schema.Types.ObjectId, ref: 'Company' },
    // Monotonically incremented inside the allocation transaction so two
    // concurrent allocation attempts on this vehicle serialize instead of
    // both succeeding (see utils/transaction.util.ts + vehicle-allocation.service.ts).
    allocationVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VehicleSchema.index({
  registrationNumber: 'text',
  make: 'text',
  model: 'text',
  currentLocation: 'text',
  assignedProject: 'text',
});

export const Vehicle = mongoose.model<IVehicleDocument>('Vehicle', VehicleSchema);
