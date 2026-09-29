import { VehicleRepository, DriverRepository } from '../repositories/index.js';
import { IVehicleDocument, IDriverDocument } from '../interfaces/vehicle.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { buildFirmFilter, assertFirmAccess } from '../middlewares/firm-scope.middleware.js';
import { escapeRegex } from '../utils/query.util.js';

export class VehicleService {
  private vehicleRepo = new VehicleRepository();
  private driverRepo = new DriverRepository();

  async getVehicles(params: PaginationParams, firmScope?: FirmScope): Promise<PaginatedResult<IVehicleDocument>> {
    const filter: any = { ...buildFirmFilter(firmScope, 'homeEntity') };
    if (params.search) {
      const s = escapeRegex(params.search);
      filter.$or = [
        { registrationNumber: { $regex: s, $options: 'i' } },
        { make: { $regex: s, $options: 'i' } },
        { model: { $regex: s, $options: 'i' } },
        { currentLocation: { $regex: s, $options: 'i' } },
        { assignedProject: { $regex: s, $options: 'i' } },
      ];
    }
    if (params.status) filter.status = params.status;
    if (params.vehicleType) filter.vehicleType = params.vehicleType;
    if (params.fuelType) filter.fuelType = params.fuelType;

    return this.vehicleRepo.paginate(filter, params, [
      { path: 'assignedDriver' },
      { path: 'createdBy', select: 'name email' },
    ]);
  }

  async getVehicleById(id: string, firmScope?: FirmScope): Promise<IVehicleDocument> {
    const vehicle = await this.vehicleRepo.findById(id, undefined, [
      { path: 'assignedDriver' },
      { path: 'createdBy', select: 'name email' },
    ]);
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    assertFirmAccess((vehicle as any).homeEntity, firmScope);
    return vehicle;
  }

  async createVehicle(data: any, createdById: string): Promise<IVehicleDocument> {
    const existing = await this.vehicleRepo.findOne({
      registrationNumber: data.registrationNumber.toUpperCase().trim(),
    });
    if (existing) {
      throw ApiError.conflict(`Vehicle with registration ${data.registrationNumber} already exists`);
    }

    const vehicle = await this.vehicleRepo.create({
      ...data,
      registrationNumber: data.registrationNumber.toUpperCase().trim(),
      createdBy: createdById as any,
    });

    if (data.assignedDriver) {
      await this.driverRepo.updateById(data.assignedDriver, { assignedVehicle: vehicle._id as any });
    }

    return vehicle;
  }

  async updateVehicle(id: string, data: any, firmScope?: FirmScope): Promise<IVehicleDocument> {
    const vehicle = await this.getVehicleById(id, firmScope);

    // Check driver re-assignment
    if (data.assignedDriver && data.assignedDriver !== vehicle.assignedDriver?._id?.toString()) {
      if (vehicle.assignedDriver?._id) {
        await this.driverRepo.updateById(vehicle.assignedDriver._id.toString(), { assignedVehicle: undefined });
      }
      await this.driverRepo.updateById(data.assignedDriver, { assignedVehicle: vehicle._id as any });
    }

    const updated = await this.vehicleRepo.updateById(id, data);
    if (!updated) throw ApiError.notFound('Vehicle not found');
    return updated;
  }

  async addMaintenanceRecord(id: string, record: any): Promise<IVehicleDocument> {
    const vehicle = await this.getVehicleById(id);
    vehicle.maintenanceHistory = vehicle.maintenanceHistory || [];
    vehicle.maintenanceHistory.unshift(record);

    if (record.odometerReading && record.odometerReading > vehicle.odometerKm) {
      vehicle.odometerKm = record.odometerReading;
    }

    await vehicle.save();
    return vehicle;
  }

  async getUpcomingComplianceExpiries(days: number = 30): Promise<any[]> {
    const vehicles = await this.vehicleRepo.findVehiclesWithUpcomingExpiries(days);
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const alerts: any[] = [];

    vehicles.forEach((v) => {
      const docs = [
        { name: 'Insurance', data: v.insurance },
        { name: 'Fitness Certificate', data: v.fitness },
        { name: 'Permit', data: v.permit },
        { name: 'Road Tax', data: v.tax },
        { name: 'Pollution Under Control (PUC)', data: v.puc },
      ];

      docs.forEach((doc) => {
        if (doc.data && doc.data.expiryDate) {
          const exp = new Date(doc.data.expiryDate);
          if (exp <= targetDate) {
            const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
            alerts.push({
              vehicleId: v._id,
              registrationNumber: v.registrationNumber,
              vehicleType: v.vehicleType,
              makeModel: `${v.make} ${v.model}`,
              documentType: doc.name,
              documentNumber: doc.data.documentNumber,
              expiryDate: exp,
              daysLeft: diffDays,
              isExpired: diffDays <= 0,
              currentLocation: v.currentLocation,
            });
          }
        }
      });
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  async deleteVehicle(id: string, firmScope?: FirmScope): Promise<void> {
    await this.getVehicleById(id, firmScope);
    await this.vehicleRepo.deleteById(id);
  }

  // --- Driver Sub-Services ---
  async getDrivers(params: PaginationParams): Promise<PaginatedResult<IDriverDocument>> {
    const filter: any = {};
    if (params.search) {
      const s = escapeRegex(params.search);
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { licenseNumber: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
      ];
    }
    if (params.status) filter.status = params.status;

    return this.driverRepo.paginate(filter, params, [{ path: 'assignedVehicle', select: 'registrationNumber make model' }]);
  }

  async createDriver(data: any): Promise<IDriverDocument> {
    const existing = await this.driverRepo.findOne({ licenseNumber: data.licenseNumber.toUpperCase().trim() });
    if (existing) {
      throw ApiError.conflict(`Driver with license ${data.licenseNumber} already exists`);
    }

    return this.driverRepo.create({
      ...data,
      licenseNumber: data.licenseNumber.toUpperCase().trim(),
    });
  }

  async updateDriver(id: string, data: any): Promise<IDriverDocument> {
    const driver = await this.driverRepo.updateById(id, data);
    if (!driver) throw ApiError.notFound('Driver not found');
    return driver;
  }

  async deleteDriver(id: string): Promise<void> {
    const driver = await this.driverRepo.findById(id);
    if (!driver) throw ApiError.notFound('Driver not found');
    await this.driverRepo.deleteById(id);
  }
}
