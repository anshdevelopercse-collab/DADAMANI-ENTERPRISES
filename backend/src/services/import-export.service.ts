import * as XLSX from 'xlsx';
import { ExcelUtil } from '../utils/excel.util.js';
import { PdfUtil } from '../utils/pdf.util.js';
import {
  TenderRepository,
  AwardedTenderRepository,
  VehicleRepository,
  WorkOrderRepository,
  ImportHistoryRepository,
} from '../repositories/index.js';
import { ApiError } from '../utils/api-response.util.js';
import { TenderStatus, FuelType, VehicleStatus, WorkOrderStatus } from '../constants/status.constant.js';
import { FirmScope } from '../interfaces/common.interface.js';
import { buildFirmFilter } from '../middlewares/firm-scope.middleware.js';

export class ImportExportService {
  private tenderRepo = new TenderRepository();
  private awardedRepo = new AwardedTenderRepository();
  private vehicleRepo = new VehicleRepository();
  private workOrderRepo = new WorkOrderRepository();
  private importHistoryRepo = new ImportHistoryRepository();

  /**
   * Step 1: Inspect Workbook sheets & headers
   */
  inspectFile(fileBuffer: Buffer) {
    return ExcelUtil.inspectWorkbook(fileBuffer);
  }

  /**
   * Step 2: Validate and preview rows against schema mapping
   */
  async previewAndValidate(
    fileBuffer: Buffer,
    sheetName: string,
    module: 'Tenders' | 'AwardedTenders' | 'Vehicles' | 'WorkOrders',
    headerMapping: Record<string, string> // e.g. { "Tender ID": "tenderNumber", "Title": "title" }
  ) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw ApiError.badRequest(`Sheet "${sheetName}" not found in workbook`);

    const rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    const validatedRows: any[] = [];
    const errors: { row: number; errors: string[]; rawData: any }[] = [];
    const duplicates: { row: number; key: string; rawData: any }[] = [];

    // Preload existing unique keys to detect duplicates
    const existingKeys = new Set<string>();
    if (module === 'Tenders') {
      const tenders = await this.tenderRepo.find({}, 'tenderNumber');
      tenders.forEach((t) => existingKeys.add(t.tenderNumber.toUpperCase()));
    } else if (module === 'Vehicles') {
      const vehicles = await this.vehicleRepo.find({}, 'registrationNumber');
      vehicles.forEach((v) => existingKeys.add(v.registrationNumber.toUpperCase()));
    } else if (module === 'WorkOrders') {
      const orders = await this.workOrderRepo.find({}, 'orderNumber');
      orders.forEach((o) => existingKeys.add(o.orderNumber.toUpperCase()));
    }

    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2; // +2 for Excel row offset (1 header + 1-indexed)
      const mappedObject: any = {};
      const rowErrors: string[] = [];

      Object.entries(headerMapping).forEach(([fileCol, targetField]) => {
        if (targetField && row[fileCol] !== undefined) {
          mappedObject[targetField] = row[fileCol];
        }
      });

      // Module-specific validation & duplicate check
      if (module === 'Tenders') {
        if (!mappedObject.tenderNumber) rowErrors.push('Missing required field: Tender Number');
        if (!mappedObject.title) rowErrors.push('Missing required field: Title');
        if (!mappedObject.clientName) rowErrors.push('Missing required field: Client Name');
        if (!mappedObject.estimatedValue || isNaN(Number(mappedObject.estimatedValue))) {
          rowErrors.push('Valid estimated value is required');
        }

        const key = String(mappedObject.tenderNumber || '').toUpperCase().trim();
        if (existingKeys.has(key)) {
          duplicates.push({ row: rowNumber, key, rawData: mappedObject });
        }
      } else if (module === 'Vehicles') {
        if (!mappedObject.registrationNumber) rowErrors.push('Missing Registration Number');
        if (!mappedObject.make) rowErrors.push('Missing Make');
        if (!mappedObject.model) rowErrors.push('Missing Model');

        const key = String(mappedObject.registrationNumber || '').toUpperCase().trim();
        if (existingKeys.has(key)) {
          duplicates.push({ row: rowNumber, key, rawData: mappedObject });
        }
      } else if (module === 'WorkOrders') {
        if (!mappedObject.orderNumber) rowErrors.push('Missing Work Order Number');
        if (!mappedObject.title) rowErrors.push('Missing Title');
        if (!mappedObject.clientName) rowErrors.push('Missing Client Name');

        const key = String(mappedObject.orderNumber || '').toUpperCase().trim();
        if (existingKeys.has(key)) {
          duplicates.push({ row: rowNumber, key, rawData: mappedObject });
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, errors: rowErrors, rawData: mappedObject });
      } else {
        validatedRows.push({ rowNumber, data: mappedObject });
      }
    });

    return {
      totalRows: rawRows.length,
      validRowsCount: validatedRows.length,
      invalidRowsCount: errors.length,
      duplicateRowsCount: duplicates.length,
      previewValid: validatedRows.slice(0, 5),
      errors: errors.slice(0, 50),
      duplicates: duplicates.slice(0, 50),
    };
  }

  /**
   * Step 3: Execute Import with Skip Duplicates / Partial Import options
   */
  async executeImport(
    fileBuffer: Buffer,
    sheetName: string,
    fileName: string,
    module: 'Tenders' | 'AwardedTenders' | 'Vehicles' | 'WorkOrders',
    headerMapping: Record<string, string>,
    options: { skipDuplicates?: boolean; allowPartial?: boolean } = {},
    userId: string,
    firmId?: string
  ) {
    const preview = await this.previewAndValidate(fileBuffer, sheetName, module, headerMapping);

    if (preview.invalidRowsCount > 0 && !options.allowPartial) {
      throw ApiError.badRequest(
        `Import rejected. Found ${preview.invalidRowsCount} invalid rows. Enable "Allow Partial Import" to import valid rows.`,
        'IMP_001',
        preview.errors
      );
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    const duplicateKeys = new Set(preview.duplicates.map((d) => d.key));
    const importedRecords: any[] = [];
    const failedLog: any[] = [];

    for (let idx = 0; idx < rawRows.length; idx++) {
      const row = rawRows[idx];
      const rowNumber = idx + 2;
      const mapped: any = {};

      Object.entries(headerMapping).forEach(([fileCol, targetField]) => {
        if (targetField && row[fileCol] !== undefined) {
          mapped[targetField] = row[fileCol];
        }
      });

      try {
        if (module === 'Tenders') {
          const num = String(mapped.tenderNumber || '').toUpperCase().trim();
          if (duplicateKeys.has(num)) {
            if (options.skipDuplicates) continue;
            throw new Error(`Duplicate tender number: ${num}`);
          }

          if (!mapped.title || !mapped.clientName) {
            throw new Error('Missing title or client name');
          }

          const created = await this.tenderRepo.create({
            tenderNumber: num,
            title: mapped.title,
            clientName: mapped.clientName,
            category: mapped.category || 'Logistics',
            estimatedValue: Number(mapped.estimatedValue || 0),
            earnestMoneyDeposit: Number(mapped.earnestMoneyDeposit || 0),
            submissionDeadline: mapped.submissionDeadline ? new Date(mapped.submissionDeadline) : new Date(Date.now() + 15 * 86400000),
            status: (mapped.status as any) || TenderStatus.DRAFT,
            location: mapped.location || 'Odisha HQ',
            scopeOfWork: mapped.scopeOfWork || 'General operations tender',
            createdBy: userId as any,
            ...(firmId ? { entity: firmId as any } : {}),
          });
          importedRecords.push(created);
        } else if (module === 'Vehicles') {
          const reg = String(mapped.registrationNumber || '').toUpperCase().trim();
          if (duplicateKeys.has(reg)) {
            if (options.skipDuplicates) continue;
            throw new Error(`Duplicate vehicle registration: ${reg}`);
          }

          const defaultDate = new Date(Date.now() + 180 * 86400000);
          const created = await this.vehicleRepo.create({
            registrationNumber: reg,
            chassisNumber: mapped.chassisNumber || `CHAS-${reg}`,
            engineNumber: mapped.engineNumber || `ENG-${reg}`,
            make: mapped.make || 'Tata',
            model: mapped.model || 'Prima 2830.K',
            yearOfManufacture: Number(mapped.yearOfManufacture || 2024),
            vehicleType: mapped.vehicleType || 'Dumper / Tipper',
            fuelType: mapped.fuelType || FuelType.DIESEL,
            capacityTonnes: Number(mapped.capacityTonnes || 25),
            odometerKm: Number(mapped.odometerKm || 0),
            status: (mapped.status as any) || VehicleStatus.ACTIVE,
            currentLocation: mapped.currentLocation || 'Mining Site Alpha',
            insurance: { expiryDate: mapped.insuranceExpiry ? new Date(mapped.insuranceExpiry) : defaultDate, documentNumber: 'INS-01' },
            fitness: { expiryDate: mapped.fitnessExpiry ? new Date(mapped.fitnessExpiry) : defaultDate, documentNumber: 'FIT-01' },
            permit: { expiryDate: mapped.permitExpiry ? new Date(mapped.permitExpiry) : defaultDate, documentNumber: 'PER-01' },
            tax: { expiryDate: mapped.taxExpiry ? new Date(mapped.taxExpiry) : defaultDate, documentNumber: 'TAX-01' },
            puc: { expiryDate: mapped.pucExpiry ? new Date(mapped.pucExpiry) : defaultDate, documentNumber: 'PUC-01' },
            createdBy: userId as any,
            ...(firmId ? { homeEntity: firmId as any } : {}),
          });
          importedRecords.push(created);
        } else if (module === 'WorkOrders') {
          const ord = String(mapped.orderNumber || '').toUpperCase().trim();
          if (duplicateKeys.has(ord)) {
            if (options.skipDuplicates) continue;
            throw new Error(`Duplicate work order number: ${ord}`);
          }

          const created = await this.workOrderRepo.create({
            orderNumber: ord,
            title: mapped.title,
            clientName: mapped.clientName,
            assignedProject: mapped.assignedProject || 'Highwall Operations',
            siteLocation: mapped.siteLocation || 'Angul Logistics Hub',
            assignedManager: userId as any,
            contractValue: Number(mapped.contractValue || 1000000),
            startDate: mapped.startDate ? new Date(mapped.startDate) : new Date(),
            targetEndDate: mapped.targetEndDate ? new Date(mapped.targetEndDate) : new Date(Date.now() + 60 * 86400000),
            status: (mapped.status as any) || WorkOrderStatus.ASSIGNED,
            createdBy: userId as any,
            ...(firmId ? { entity: firmId as any } : {}),
          });
          importedRecords.push(created);
        }
      } catch (err: any) {
        failedLog.push({
          rowNumber,
          data: mapped,
          errors: [err.message],
        });
      }
    }

    // Record Import History
    const history = await this.importHistoryRepo.create({
      fileName,
      module,
      totalRows: rawRows.length,
      successfulRows: importedRecords.length,
      failedRows: failedLog.length,
      duplicateRows: preview.duplicateRowsCount,
      status: failedLog.length === 0 ? 'Completed' : importedRecords.length > 0 ? 'Partially Completed' : 'Failed',
      sheetName,
      importedBy: userId as any,
      errorLog: failedLog,
    });

    return {
      historyId: history._id,
      totalRows: rawRows.length,
      successfulCount: importedRecords.length,
      failedCount: failedLog.length,
      duplicateCount: preview.duplicateRowsCount,
      status: history.status,
      errors: failedLog,
    };
  }

  /**
   * Universal Export Generator (Excel, PDF, CSV)
   * firmScope is applied to all entity-bearing modules so Restricted users
   * only export data belonging to their authorized firms.
   */
  async generateExport(
    module: 'tenders' | 'awarded' | 'vehicles' | 'work-orders' | 'audit-logs',
    format: 'excel' | 'pdf' | 'csv',
    filter: any = {},
    firmScope?: FirmScope
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    let title = '';
    let columns: { header: string; key: string; width?: number }[] = [];
    let data: any[] = [];

    if (module === 'tenders') {
      title = 'Tenders Report';
      columns = [
        { header: 'Tender No', key: 'tenderNumber', width: 18 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Client', key: 'clientName', width: 25 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Estimated Value (₹)', key: 'estimatedValue', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Deadline', key: 'submissionDeadline', width: 18 },
        { header: 'Location', key: 'location', width: 20 },
      ];
      const scopeFilter = buildFirmFilter(firmScope);
      data = await this.tenderRepo.find({ ...scopeFilter }, undefined, { createdAt: -1 });
    } else if (module === 'vehicles') {
      title = 'Fleet Vehicles Report';
      columns = [
        { header: 'Registration No', key: 'registrationNumber', width: 20 },
        { header: 'Make & Model', key: 'makeModel', width: 25 },
        { header: 'Type', key: 'vehicleType', width: 22 },
        { header: 'Capacity (Tons)', key: 'capacityTonnes', width: 16 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Location', key: 'currentLocation', width: 20 },
        { header: 'Odometer (KM)', key: 'odometerKm', width: 16 },
      ];
      const scopeFilter = buildFirmFilter(firmScope, 'homeEntity');
      const vehicles = await this.vehicleRepo.find({ ...scopeFilter }, undefined, { createdAt: -1 });
      data = vehicles.map((v) => ({
        ...v.toObject(),
        makeModel: `${v.make} ${v.model}`,
      }));
    } else if (module === 'awarded') {
      title = 'Awarded Contracts Report';
      columns = [
        { header: 'Contract No', key: 'contractNumber', width: 20 },
        { header: 'Tender No', key: 'tenderNumber', width: 18 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Client', key: 'clientName', width: 25 },
        { header: 'Award Value (₹)', key: 'awardValue', width: 20 },
        { header: 'Projected Profit (₹)', key: 'projectedProfit', width: 20 },
        { header: 'Margin %', key: 'profitMarginPercent', width: 12 },
        { header: 'Status', key: 'executionStatus', width: 18 },
      ];
      const scopeFilter = buildFirmFilter(firmScope);
      data = await this.awardedRepo.find({ ...scopeFilter }, undefined, { createdAt: -1 });
    } else if (module === 'work-orders') {
      title = 'Work Orders Report';
      columns = [
        { header: 'Order No', key: 'orderNumber', width: 18 },
        { header: 'Title', key: 'title', width: 28 },
        { header: 'Client', key: 'clientName', width: 22 },
        { header: 'Project', key: 'assignedProject', width: 20 },
        { header: 'Site Location', key: 'siteLocation', width: 20 },
        { header: 'Contract Value (₹)', key: 'contractValue', width: 20 },
        { header: 'Progress %', key: 'progressPercentage', width: 14 },
        { header: 'Status', key: 'status', width: 16 },
      ];
      const scopeFilter = buildFirmFilter(firmScope);
      data = await this.workOrderRepo.find({ ...scopeFilter }, undefined, { createdAt: -1 });
    }

    if (format === 'excel') {
      const buffer = await ExcelUtil.exportToExcel(title, columns, data);
      return {
        buffer,
        filename: `${module}_export_${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } else if (format === 'pdf') {
      const headers = columns.map((c) => c.header);
      const rows = data.map((item) =>
        columns.map((c) => {
          let val = item[c.key];
          if (val instanceof Date) return val.toLocaleDateString();
          return val !== undefined && val !== null ? String(val) : '-';
        })
      );

      const buffer = await PdfUtil.generateReport({
        title,
        headers,
        rows,
        summaryStats: [
          { label: 'Total Records', value: String(data.length) },
          { label: 'Export Date', value: new Date().toLocaleDateString() },
        ],
      });

      return {
        buffer,
        filename: `${module}_export_${Date.now()}.pdf`,
        contentType: 'application/pdf',
      };
    } else {
      // CSV Export
      const headers = columns.map((c) => `"${c.header}"`).join(',');
      const rows = data.map((item) =>
        columns
          .map((c) => {
            const val = item[c.key] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      const csvString = [headers, ...rows].join('\n');
      return {
        buffer: Buffer.from(csvString, 'utf-8'),
        filename: `${module}_export_${Date.now()}.csv`,
        contentType: 'text/csv',
      };
    }
  }

  async getHistory() {
    return this.importHistoryRepo.find({}, undefined, { createdAt: -1 });
  }

  async getTemplate(type: string) {
    let title = 'Import Template';
    let columns: { header: string; key: string; width?: number }[] = [];
    if (type === 'tenders') {
      title = 'Tenders Template';
      columns = [
        { header: 'Tender Number', key: 'tenderNumber', width: 20 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Client Name', key: 'clientName', width: 25 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Estimated Value', key: 'estimatedValue', width: 20 },
        { header: 'Location', key: 'location', width: 20 },
      ];
    } else if (type === 'vehicles') {
      title = 'Vehicles Template';
      columns = [
        { header: 'Registration Number', key: 'registrationNumber', width: 20 },
        { header: 'Make', key: 'make', width: 20 },
        { header: 'Model', key: 'model', width: 20 },
        { header: 'Vehicle Type', key: 'vehicleType', width: 22 },
        { header: 'Capacity Tonnes', key: 'capacityTonnes', width: 16 },
      ];
    } else if (type === 'work-orders') {
      title = 'Work Orders Template';
      columns = [
        { header: 'Order Number', key: 'orderNumber', width: 20 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Client Name', key: 'clientName', width: 25 },
        { header: 'Contract Value', key: 'contractValue', width: 20 },
      ];
    } else {
      title = `${type} Template`;
      columns = [
        { header: 'ID', key: 'id', width: 20 },
        { header: 'Title', key: 'title', width: 30 },
      ];
    }

    const buffer = await ExcelUtil.exportToExcel(title, columns, []);
    return {
      buffer,
      filename: `${type}_template.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

