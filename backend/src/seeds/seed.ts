import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Role } from '../models/role.model.js';
import { Company } from '../models/company.model.js';
import { Tender } from '../models/tender.model.js';
import { AwardedTender } from '../models/awarded-tender.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Driver } from '../models/driver.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { Setting, AuditLog } from '../models/audit-log.model.js';
import { Notification } from '../models/notification.model.js';
import { UserRole, TenderStatus, VehicleStatus, FuelType, WorkOrderStatus, AuditAction, NotificationPriority, NotificationType } from '../constants/status.constant.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.constant.js';
import { logger } from '../config/logger.config.js';

export const seedDatabase = async () => {
  try {
    await connectDatabase();
    logger.info('Purging and seeding database with enterprise datasets...');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Company.deleteMany({}),
      Tender.deleteMany({}),
      AwardedTender.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      WorkOrder.deleteMany({}),
      Setting.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // 1. Roles
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await Role.create({
        name: roleName,
        description: `Enterprise ${roleName} role with predefined permissions`,
        permissions,
        isSystemRole: true,
      });
    }

    // 2. Company Info
    await Company.create({
      name: 'Dada Mani Logistics & Mining Infrastructure Ltd.',
      code: 'DMI-CORP',
      registrationNumber: 'U60200OR2010PLC012345',
      gstNumber: '21AAACD1234F1Z5',
      panNumber: 'AAACD1234F',
      email: 'corporate@dadamani.com',
      phone: '+91 674 259 8890',
      address: 'Dada Mani Headquarters, Plot 42, Infocity Industrial Corridor',
      city: 'Bhubaneswar',
      state: 'Odisha',
      isActive: true,
    });

    // 3. Settings
    await Setting.create({
      companyName: 'Dada Mani Enterprise Operations',
      companyTagline: 'Heavy Logistics, Mining, Fleet & Infrastructure Operations',
      companyEmail: 'operations@dadamani.com',
      companyPhone: '+91 98765 43210',
      companyAddress: 'Dada Mani Operations Hub, Mining Highway 14, Talcher, Odisha',
      gstNumber: '21AAACD1234F1Z5',
      panNumber: 'AAACD1234F',
      currencySymbol: '₹',
      defaultTimezone: 'Asia/Kolkata',
      alertDaysBeforeExpiry: 30,
    });

    // 4. Users (Admin, Manager, Viewer)
    const adminUser = await User.create({
      name: 'Dada Mani Super Admin',
      email: 'ansh.developer.cse@gmail.com',
      password: 'Admin@123456',
      role: UserRole.ADMIN,
      phone: '+91 98765 00001',
      department: 'Executive Operations',
      designation: 'Managing Director & VP Systems',
      isActive: true,
      isEmailVerified: true,
    });

    const managerUser = await User.create({
      name: 'Rajesh Mohapatra',
      email: 'manager@dadamani.com',
      password: 'Manager@123456',
      role: UserRole.MANAGER,
      phone: '+91 98765 00002',
      department: 'Fleet & Logistics',
      designation: 'General Operations Manager',
      isActive: true,
      isEmailVerified: true,
    });

    const viewerUser = await User.create({
      name: 'Sunil Patnaik',
      email: 'viewer@dadamani.com',
      password: 'Viewer@123456',
      role: UserRole.VIEWER,
      phone: '+91 98765 00003',
      department: 'Contracts & Audits',
      designation: 'Compliance Officer',
      isActive: true,
      isEmailVerified: true,
    });

    // 5. Drivers
    const drivers = await Driver.insertMany([
      {
        name: 'Bhabani Shankar Pradhan',
        licenseNumber: 'OD-05-20150034921',
        licenseExpiry: new Date(Date.now() + 365 * 86400000),
        phone: '+91 94371 11223',
        status: 'Active',
        experienceYears: 12,
        rating: 5,
      },
      {
        name: 'Manoj Kumar Sahu',
        licenseNumber: 'OD-14-20170087412',
        licenseExpiry: new Date(Date.now() + 180 * 86400000),
        phone: '+91 94372 33445',
        status: 'Active',
        experienceYears: 8,
        rating: 4.8,
      },
      {
        name: 'Dillip Rout',
        licenseNumber: 'OD-02-20120011984',
        licenseExpiry: new Date(Date.now() + 90 * 86400000),
        phone: '+91 94373 55667',
        status: 'Active',
        experienceYears: 15,
        rating: 4.9,
      },
      {
        name: 'Suresh Nayak',
        licenseNumber: 'OD-19-20190055123',
        licenseExpiry: new Date(Date.now() + 30 * 86400000),
        phone: '+91 94374 77889',
        status: 'Active',
        experienceYears: 5,
        rating: 4.5,
      },
    ]);

    // 6. Vehicles (Heavy Fleet with realistic compliance expiries)
    const now = Date.now();
    const vehicles = await Vehicle.insertMany([
      {
        registrationNumber: 'OD-02-AZ-8811',
        chassisNumber: 'MAT628045L4N10291',
        engineNumber: 'CUMMINS-ISBE-8811',
        make: 'Tata Motors',
        model: 'Prima 2830.K Heavy Tipper',
        yearOfManufacture: 2023,
        vehicleType: 'Dumper / Tipper',
        fuelType: FuelType.DIESEL,
        capacityTonnes: 28,
        odometerKm: 42150,
        status: VehicleStatus.ACTIVE,
        currentLocation: 'MCL Coal Fields, Talcher',
        assignedDriver: drivers[0]._id,
        assignedProject: 'MCL High-Volume Coal Evacuation',
        insurance: {
          documentNumber: 'HDFC-ERGO-8811902',
          expiryDate: new Date(now + 12 * 86400000), // Expiries in 12 days -> Trigger alert
          isExpired: false,
        },
        fitness: {
          documentNumber: 'OD-RTO-FIT-99120',
          expiryDate: new Date(now + 140 * 86400000),
          isExpired: false,
        },
        permit: {
          documentNumber: 'OD-NP-PERMIT-2023',
          expiryDate: new Date(now + 210 * 86400000),
          isExpired: false,
        },
        tax: {
          documentNumber: 'OD-ROAD-TAX-2024',
          expiryDate: new Date(now + 80 * 86400000),
          isExpired: false,
        },
        puc: {
          documentNumber: 'PUC-TALCHER-0021',
          expiryDate: new Date(now + 5 * 86400000), // Expiries in 5 days -> Critical alert
          isExpired: false,
        },
        createdBy: adminUser._id,
      },
      {
        registrationNumber: 'OD-14-BX-4422',
        chassisNumber: 'ME3540023K1M09283',
        engineNumber: 'MERC-OM906-4422',
        make: 'BharatBenz',
        model: '2828C Mining Tipper 6x4',
        yearOfManufacture: 2024,
        vehicleType: 'Dumper / Tipper',
        fuelType: FuelType.DIESEL,
        capacityTonnes: 28,
        odometerKm: 28400,
        status: VehicleStatus.ACTIVE,
        currentLocation: 'Tata Steel Kalinganagar Plant',
        assignedDriver: drivers[1]._id,
        assignedProject: 'Kalinganagar Slag & Iron Ore Transport',
        insurance: {
          documentNumber: 'ICICI-LOMB-4422019',
          expiryDate: new Date(now + 240 * 86400000),
          isExpired: false,
        },
        fitness: {
          documentNumber: 'OD-RTO-FIT-44229',
          expiryDate: new Date(now + 22 * 86400000), // Expiries in 22 days
          isExpired: false,
        },
        permit: {
          documentNumber: 'OD-NP-PERMIT-4422',
          expiryDate: new Date(now + 300 * 86400000),
          isExpired: false,
        },
        tax: {
          documentNumber: 'OD-ROAD-TAX-4422',
          expiryDate: new Date(now + 180 * 86400000),
          isExpired: false,
        },
        puc: {
          documentNumber: 'PUC-JAJPUR-0089',
          expiryDate: new Date(now + 90 * 86400000),
          isExpired: false,
        },
        createdBy: adminUser._id,
      },
      {
        registrationNumber: 'OD-05-CX-1099',
        chassisNumber: 'YV2RT40A9PB128941',
        engineNumber: 'VOLVO-D13-1099',
        make: 'Volvo Trucks',
        model: 'FMX 460 8x4 Heavy Hauler',
        yearOfManufacture: 2023,
        vehicleType: 'Trailer',
        fuelType: FuelType.DIESEL,
        capacityTonnes: 45,
        odometerKm: 61200,
        status: VehicleStatus.ACTIVE,
        currentLocation: 'Paradeep Port Bulk Terminal',
        assignedDriver: drivers[2]._id,
        assignedProject: 'Paradeep Port Iron Ore Pellets Evacuation',
        insurance: {
          documentNumber: 'TATA-AIG-109923',
          expiryDate: new Date(now + 190 * 86400000),
          isExpired: false,
        },
        fitness: {
          documentNumber: 'OD-RTO-FIT-10991',
          expiryDate: new Date(now + 190 * 86400000),
          isExpired: false,
        },
        permit: {
          documentNumber: 'OD-NP-PERMIT-1099',
          expiryDate: new Date(now + 15 * 86400000), // Expiry in 15 days
          isExpired: false,
        },
        tax: {
          documentNumber: 'OD-ROAD-TAX-1099',
          expiryDate: new Date(now + 150 * 86400000),
          isExpired: false,
        },
        puc: {
          documentNumber: 'PUC-PARADEEP-0044',
          expiryDate: new Date(now + 120 * 86400000),
          isExpired: false,
        },
        createdBy: adminUser._id,
      },
      {
        registrationNumber: 'OD-19-EX-7700',
        chassisNumber: 'CAT336DL-HEX-77001',
        engineNumber: 'CAT-C9-ACERT-7700',
        make: 'Caterpillar',
        model: 'CAT 336D2 L Hydraulic Excavator',
        yearOfManufacture: 2022,
        vehicleType: 'Excavator',
        fuelType: FuelType.DIESEL,
        capacityTonnes: 36,
        odometerKm: 8500, // Operating hours
        status: VehicleStatus.MAINTENANCE,
        currentLocation: 'Joda Iron Ore Pit 3',
        assignedDriver: drivers[3]._id,
        assignedProject: 'Joda Mines Overburden Removal',
        insurance: {
          documentNumber: 'NEW-INDIA-770019',
          expiryDate: new Date(now + 310 * 86400000),
          isExpired: false,
        },
        fitness: {
          documentNumber: 'OD-MINES-FIT-7700',
          expiryDate: new Date(now + 120 * 86400000),
          isExpired: false,
        },
        permit: {
          documentNumber: 'OD-MINING-PERMIT-7700',
          expiryDate: new Date(now + 180 * 86400000),
          isExpired: false,
        },
        tax: {
          documentNumber: 'OD-MINES-TAX-7700',
          expiryDate: new Date(now + 120 * 86400000),
          isExpired: false,
        },
        puc: {
          documentNumber: 'PUC-JODA-0912',
          expiryDate: new Date(now + 60 * 86400000),
          isExpired: false,
        },
        createdBy: adminUser._id,
      },
    ]);

    // 7. Tenders
    const tenders = await Tender.insertMany([
      {
        tenderNumber: 'MCL/GM/LOG-2026/044',
        title: 'Transportation of 2.5 Million MT Coal from Hingula OCP to Railway Siding No. 4',
        clientName: 'Mahanadi Coalfields Limited (Coal India Ltd)',
        clientDepartment: 'Materials & Transport Division',
        category: 'Logistics',
        estimatedValue: 485000000, // 48.5 Crore
        earnestMoneyDeposit: 9700000,
        submissionDeadline: new Date(now + 18 * 86400000),
        openingDate: new Date(now + 20 * 86400000),
        status: TenderStatus.SUBMITTED,
        location: 'Talcher Coalfields, Angul, Odisha',
        state: 'Odisha',
        scopeOfWork: 'Internal hauling, mechanized tipper loading, weighbridge validation and dispatch at siding 24x7.',
        assignedManager: managerUser._id,
        isArchived: false,
        createdBy: adminUser._id,
      },
      {
        tenderNumber: 'TSL/KPO/SLAG-2026/012',
        title: 'Granulated Blast Furnace Slag & Iron Ore Pellets Evacuation',
        clientName: 'Tata Steel Limited (Kalinganagar Plant)',
        clientDepartment: 'Raw Materials Logistics',
        category: 'Transport',
        estimatedValue: 240000000, // 24 Crore
        earnestMoneyDeposit: 4800000,
        submissionDeadline: new Date(now - 10 * 86400000),
        openingDate: new Date(now - 8 * 86400000),
        status: TenderStatus.AWARDED,
        location: 'Kalinganagar Industrial Complex, Jajpur',
        state: 'Odisha',
        scopeOfWork: 'Daily fleet movement of 1500 MT slag and heavy ore pellets with high-speed multi-axle dumpers.',
        assignedManager: managerUser._id,
        isArchived: false,
        createdBy: adminUser._id,
      },
      {
        tenderNumber: 'NHAI/PIU-BBSR/FOUR-LANE/09',
        title: 'Earthwork, Embankment & Aggregate Supply for 4-Lane Coastal Highway Pkg-2',
        clientName: 'National Highways Authority of India (NHAI)',
        clientDepartment: 'Civil Infrastructure',
        category: 'Construction',
        estimatedValue: 620000000, // 62 Crore
        earnestMoneyDeposit: 12400000,
        submissionDeadline: new Date(now + 35 * 86400000),
        openingDate: new Date(now + 40 * 86400000),
        status: TenderStatus.DRAFT,
        location: 'Puri - Satapada Corridor',
        state: 'Odisha',
        scopeOfWork: 'Quarrying, transport of stone aggregates, sub-base compaction, and hydraulic roller works.',
        assignedManager: managerUser._id,
        isArchived: false,
        createdBy: adminUser._id,
      },
      {
        tenderNumber: 'NTPC/TSTPS/ASH-2025/119',
        title: 'Dry Fly Ash Transportation & Disposal to Abandoned Mine Voids',
        clientName: 'NTPC Limited (Talcher Super Thermal Power Station)',
        clientDepartment: 'Ash Management Division',
        category: 'Mining',
        estimatedValue: 180000000, // 18 Crore
        earnestMoneyDeposit: 3600000,
        submissionDeadline: new Date(now - 60 * 86400000),
        openingDate: new Date(now - 55 * 86400000),
        status: TenderStatus.AWARDED,
        location: 'Kaniha, Angul',
        state: 'Odisha',
        scopeOfWork: 'Covered bulker and tanker transit of conditioned fly ash with zero spillage compliance.',
        assignedManager: managerUser._id,
        isArchived: false,
        createdBy: adminUser._id,
      },
    ]);

    // 8. Awarded Tenders
    const awardedTenders = await AwardedTender.insertMany([
      {
        tender: tenders[1]._id,
        tenderNumber: tenders[1].tenderNumber,
        clientName: tenders[1].clientName,
        title: tenders[1].title,
        awardValue: 240000000,
        estimatedCost: 196800000,
        projectedProfit: 43200000,
        profitMarginPercent: 18.0,
        awardedDate: new Date(now - 15 * 86400000),
        startDate: new Date(now - 10 * 86400000),
        completionDeadline: new Date(now + 350 * 86400000),
        contractNumber: 'CNT-TSL-2026-904',
        vendorPartners: ['Utkal Fleet Logistics', 'Kalinga Earthmovers'],
        executionStatus: 'In Progress',
        approvalStatus: 'Approved',
        approvedBy: adminUser._id,
        approvedAt: new Date(now - 14 * 86400000),
        milestones: [
          {
            title: 'Phase 1: Initial Mobilization of 25 Heavy Tippers',
            targetDate: new Date(now - 5 * 86400000),
            completedDate: new Date(now - 4 * 86400000),
            status: 'Completed',
            billingAmount: 36000000,
          },
          {
            title: 'Phase 2: Monthly 50,000 MT Dispatch Siding Handover',
            targetDate: new Date(now + 60 * 86400000),
            status: 'In Progress',
            billingAmount: 72000000,
          },
        ],
        createdBy: adminUser._id,
      },
      {
        tender: tenders[3]._id,
        tenderNumber: tenders[3].tenderNumber,
        clientName: tenders[3].clientName,
        title: tenders[3].title,
        awardValue: 180000000,
        estimatedCost: 147600000,
        projectedProfit: 32400000,
        profitMarginPercent: 18.0,
        awardedDate: new Date(now - 45 * 86400000),
        startDate: new Date(now - 40 * 86400000),
        completionDeadline: new Date(now + 320 * 86400000),
        contractNumber: 'CNT-NTPC-2025-412',
        vendorPartners: ['Dada Mani Bulk Movers'],
        executionStatus: 'On Track',
        approvalStatus: 'Approved',
        approvedBy: adminUser._id,
        approvedAt: new Date(now - 44 * 86400000),
        createdBy: adminUser._id,
      },
    ]);

    // 9. Work Orders
    await WorkOrder.insertMany([
      {
        orderNumber: 'WO-2026-081',
        title: 'Daily Coal Dispatch Shift Operations - Siding 4',
        clientName: 'Mahanadi Coalfields Limited',
        relatedTender: tenders[0]._id,
        assignedProject: 'MCL Talcher Operations',
        siteLocation: 'Hingula OCP Weighbridge 2',
        assignedManager: managerUser._id,
        assignedVehicles: [vehicles[0]._id],
        assignedDrivers: [drivers[0]._id],
        priority: 'High',
        startDate: new Date(now - 5 * 86400000),
        targetEndDate: new Date(now + 25 * 86400000),
        status: WorkOrderStatus.IN_PROGRESS,
        contractValue: 18500000,
        progressPercentage: 45,
        milestones: [
          {
            title: 'Initial 10,000 MT Delivery',
            targetDate: new Date(now),
            status: 'Completed',
            progressPercentage: 100,
          },
          {
            title: 'Secondary 25,000 MT Delivery',
            targetDate: new Date(now + 15 * 86400000),
            status: 'In Progress',
            progressPercentage: 40,
          },
        ],
        createdBy: adminUser._id,
      },
      {
        orderNumber: 'WO-2026-042',
        title: 'Granulated Slag Movement to Paradeep Port',
        clientName: 'Tata Steel Limited',
        relatedTender: tenders[1]._id,
        assignedProject: 'Kalinganagar - Paradeep Logistics',
        siteLocation: 'Paradeep Berth 14',
        assignedManager: managerUser._id,
        assignedVehicles: [vehicles[1]._id, vehicles[2]._id],
        assignedDrivers: [drivers[1]._id, drivers[2]._id],
        priority: 'Emergency',
        startDate: new Date(now - 20 * 86400000),
        targetEndDate: new Date(now + 10 * 86400000),
        status: WorkOrderStatus.INVOICED,
        contractValue: 36000000,
        invoicedAmount: 36000000,
        invoiceNumber: 'INV-DMI-2026-0042',
        invoiceDate: new Date(now - 2 * 86400000),
        invoiceStatus: 'Sent',
        progressPercentage: 100,
        createdBy: adminUser._id,
      },
    ]);

    // 10. Audit Logs
    await AuditLog.insertMany([
      {
        user: adminUser._id,
        userName: adminUser.name,
        userRole: adminUser.role,
        userEmail: adminUser.email,
        action: AuditAction.LOGIN,
        module: 'AUTH',
        description: 'Super Admin logged in with multi-factor OTP verification',
        ipAddress: '192.168.1.100',
        status: 'SUCCESS',
      },
      {
        user: managerUser._id,
        userName: managerUser.name,
        userRole: managerUser.role,
        userEmail: managerUser.email,
        action: AuditAction.CREATE,
        module: 'TENDERS',
        description: 'Created tender submission proposal MCL/GM/LOG-2026/044',
        entityId: tenders[0]._id.toString(),
        ipAddress: '192.168.1.105',
        status: 'SUCCESS',
      },
      {
        user: adminUser._id,
        userName: adminUser.name,
        userRole: adminUser.role,
        userEmail: adminUser.email,
        action: AuditAction.UPDATE,
        module: 'AWARDED',
        description: 'Approved contract terms for TSL/KPO/SLAG-2026/012 (Value: ₹24.0 Cr)',
        entityId: awardedTenders[0]._id.toString(),
        ipAddress: '192.168.1.100',
        status: 'SUCCESS',
      },
    ]);

    // 11. Initial Notifications
    await Notification.insertMany([
      {
        title: 'Fleet Compliance Alert',
        message: 'Vehicle OD-02-AZ-8811 Insurance expires in 12 days. Please initiate renewal.',
        type: NotificationType.EXPIRY_ALERT,
        priority: NotificationPriority.CRITICAL,
        isRead: false,
        link: `/vehicles/${vehicles[0]._id}`,
      },
      {
        title: 'Tender Submission Deadline',
        message: 'MCL Coal Evacuation Tender submission deadline is in 18 days.',
        type: NotificationType.TENDER_DEADLINE,
        priority: NotificationPriority.HIGH,
        isRead: false,
        link: `/tenders/${tenders[0]._id}`,
      },
      {
        title: 'Work Order Invoiced',
        message: 'Work order WO-2026-042 for Tata Steel has been invoiced for ₹3.60 Crore.',
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.MEDIUM,
        isRead: true,
      },
    ]);

    logger.info('Enterprise Database Seed Completed Successfully!');
    logger.info('==================================================');
    logger.info('Default Credentials:');
    logger.info('Admin:   ansh.developer.cse@gmail.com / Admin@123456 (Requires OTP in Email/Console)');
    logger.info('Manager: manager@dadamani.com / Manager@123456');
    logger.info('Viewer:  viewer@dadamani.com  / Viewer@123456');
    logger.info('==================================================');
  } catch (error: any) {
    logger.error(`Database seeding failed: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  seedDatabase().then(() => process.exit(0));
}
