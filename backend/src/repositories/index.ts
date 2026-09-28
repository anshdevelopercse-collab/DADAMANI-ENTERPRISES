import { BaseRepository } from './base.repository.js';
import { User } from '../models/user.model.js';
import { IUserDocument } from '../interfaces/user.interface.js';
import { Tender } from '../models/tender.model.js';
import { ITenderDocument } from '../interfaces/tender.interface.js';
import { AwardedTender } from '../models/awarded-tender.model.js';
import { IAwardedTenderDocument } from '../interfaces/tender.interface.js';
import { Vehicle } from '../models/vehicle.model.js';
import { IVehicleDocument, IDriverDocument } from '../interfaces/vehicle.interface.js';
import { Driver } from '../models/driver.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { IWorkOrderDocument } from '../interfaces/work-order.interface.js';
import { AuditLog, ImportHistory, Setting } from '../models/audit-log.model.js';
import { IAuditLogDocument, IImportHistoryDocument, ISettingDocument } from '../interfaces/audit.interface.js';
import { DocumentRecord } from '../models/document.model.js';
import { IDocumentRecordDocument } from '../interfaces/audit.interface.js';
import { Notification } from '../models/notification.model.js';
import { INotificationDocument } from '../interfaces/audit.interface.js';
import { VehicleAllocation } from '../models/vehicle-allocation.model.js';
import { IVehicleAllocationDocument } from '../interfaces/vehicle-allocation.interface.js';

export class UserRepository extends BaseRepository<IUserDocument> {
  constructor() {
    super(User);
  }

  async findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    return this.model.findOne({ email: email.toLowerCase() }).select('+password').exec();
  }
}

export class TenderRepository extends BaseRepository<ITenderDocument> {
  constructor() {
    super(Tender);
  }
}

export class AwardedTenderRepository extends BaseRepository<IAwardedTenderDocument> {
  constructor() {
    super(AwardedTender);
  }
}

export class VehicleRepository extends BaseRepository<IVehicleDocument> {
  constructor() {
    super(Vehicle);
  }

  async findVehiclesWithUpcomingExpiries(daysThreshold: number = 30): Promise<IVehicleDocument[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysThreshold);

    return this.model
      .find({
        $or: [
          { 'insurance.expiryDate': { $lte: targetDate } },
          { 'fitness.expiryDate': { $lte: targetDate } },
          { 'permit.expiryDate': { $lte: targetDate } },
          { 'tax.expiryDate': { $lte: targetDate } },
          { 'puc.expiryDate': { $lte: targetDate } },
        ],
      })
      .populate('assignedDriver')
      .exec();
  }
}

export class DriverRepository extends BaseRepository<IDriverDocument> {
  constructor() {
    super(Driver);
  }
}

export class WorkOrderRepository extends BaseRepository<IWorkOrderDocument> {
  constructor() {
    super(WorkOrder);
  }
}

export class AuditLogRepository extends BaseRepository<IAuditLogDocument> {
  constructor() {
    super(AuditLog);
  }
}

export class ImportHistoryRepository extends BaseRepository<IImportHistoryDocument> {
  constructor() {
    super(ImportHistory);
  }
}

export class DocumentRecordRepository extends BaseRepository<IDocumentRecordDocument> {
  constructor() {
    super(DocumentRecord);
  }
}

export class NotificationRepository extends BaseRepository<INotificationDocument> {
  constructor() {
    super(Notification);
  }
}

export class SettingRepository extends BaseRepository<ISettingDocument> {
  constructor() {
    super(Setting);
  }

  async getSettings(): Promise<ISettingDocument> {
    let settings = await this.model.findOne().exec();
    if (!settings) {
      settings = await this.model.create({});
    }
    return settings;
  }
}

export class VehicleAllocationRepository extends BaseRepository<IVehicleAllocationDocument> {
  constructor() {
    super(VehicleAllocation);
  }
}
