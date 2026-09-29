import { Tender } from '../models/tender.model.js';
import { AwardedTender } from '../models/awarded-tender.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { WorkOrder } from '../models/work-order.model.js';
import { Company } from '../models/company.model.js';
import { ExcelUtil } from '../utils/excel.util.js';
import { PdfUtil } from '../utils/pdf.util.js';
import { FirmScope } from '../interfaces/common.interface.js';
import { buildFirmFilter } from '../middlewares/firm-scope.middleware.js';

export class ReportsService {
  async getDashboardReports(dateRange: { from?: string; to?: string } = {}, firmScope?: FirmScope) {
    const scopeFilter = buildFirmFilter(firmScope);
    const filter: any = { ...scopeFilter };
    if (dateRange.from || dateRange.to) {
      filter.createdAt = {};
      if (dateRange.from) filter.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) filter.createdAt.$lte = new Date(dateRange.to);
    }

    const vehicleFilter: any = { ...buildFirmFilter(firmScope, 'homeEntity') };
    if (dateRange.from || dateRange.to) {
      vehicleFilter.createdAt = filter.createdAt;
    }

    const [
      tendersByStatus,
      vehiclesByStatus,
      vehiclesByType,
      workOrdersByStatus,
      workOrdersByPriority,
      tendersAgg,
      awardedAgg,
      workOrdersAgg,
      firmsList,
      awardedByFirm,
      workOrderBudgetByFirm,
    ] = await Promise.all([
      Tender.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$estimatedValue' } } },
      ]),
      Vehicle.aggregate([
        { $match: vehicleFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Vehicle.aggregate([
        { $match: vehicleFilter },
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
      ]),
      WorkOrder.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      WorkOrder.aggregate([
        { $match: filter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Tender.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            value: { $sum: '$estimatedValue' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AwardedTender.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            value: { $sum: '$awardValue' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WorkOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBudget: { $sum: '$contractValue' },
            totalActualCost: { $sum: '$actualCostSpent' },
          },
        },
      ]),
      Company.find({ isActive: true }).select('_id name code isPrimary').lean(),
      AwardedTender.aggregate([
        { $match: { entity: { $exists: true, $ne: null } } },
        { $group: { _id: '$entity', awardedRevenue: { $sum: '$awardValue' } } },
      ]),
      WorkOrder.aggregate([
        { $match: { entity: { $exists: true, $ne: null } } },
        { $group: { _id: '$entity', totalBudget: { $sum: '$contractValue' }, totalActualCost: { $sum: '$actualCostSpent' } } },
      ]),
    ]);

    const totalTenderVal = tendersAgg.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
    const totalAwardedVal = awardedAgg.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
    const woTotals = workOrdersAgg[0] || { totalBudget: 0, totalActualCost: 0 };

    const financialByFirm = firmsList.map((firm) => {
      const fid = firm._id.toString();
      return {
        firmId: fid,
        firmName: firm.name,
        firmCode: firm.code,
        isPrimary: firm.isPrimary,
        awardedRevenue: awardedByFirm.find((r: any) => r._id?.toString() === fid)?.awardedRevenue ?? 0,
        totalBudget: workOrderBudgetByFirm.find((r: any) => r._id?.toString() === fid)?.totalBudget ?? 0,
        actualCost: workOrderBudgetByFirm.find((r: any) => r._id?.toString() === fid)?.totalActualCost ?? 0,
      };
    });

    return {
      tendersByStatus,
      tendersByMonth: tendersAgg.map((t: any) => ({ month: t._id, count: t.count, value: t.value })),
      vehiclesByStatus,
      vehiclesByType,
      workOrdersByStatus,
      workOrdersByPriority,
      awardedTendersByMonth: awardedAgg.map((a: any) => ({ month: a._id, count: a.count, value: a.value })),
      financialSummary: {
        totalTenderValue: totalTenderVal,
        totalAwardedValue: totalAwardedVal,
        totalWorkOrderBudget: woTotals.totalBudget || 0,
        totalActualCost: woTotals.totalActualCost || 0,
      },
      financialByFirm,
    };
  }

  async exportReportsExcel(dateRange: any = {}, firmScope?: FirmScope) {
    const reportData = await this.getDashboardReports(dateRange, firmScope);
    const columns = [
      { header: 'Metric Category', key: 'category', width: 25 },
      { header: 'Status / Label', key: 'label', width: 25 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Value (₹)', key: 'value', width: 20 },
    ];

    const data: any[] = [];
    reportData.tendersByStatus.forEach((t: any) => {
      data.push({ category: 'Tenders By Status', label: t._id, count: t.count, value: t.totalValue || 0 });
    });
    reportData.vehiclesByStatus.forEach((v: any) => {
      data.push({ category: 'Vehicles By Status', label: v._id, count: v.count, value: '-' });
    });
    reportData.workOrdersByStatus.forEach((w: any) => {
      data.push({ category: 'Work Orders By Status', label: w._id, count: w.count, value: '-' });
    });

    const buffer = await ExcelUtil.exportToExcel('Business Intelligence Report', columns, data);
    return {
      buffer,
      filename: `dada_mani_report_${new Date().toISOString().slice(0, 10)}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async exportReportsPdf(dateRange: any = {}, firmScope?: FirmScope) {
    const reportData = await this.getDashboardReports(dateRange, firmScope);
    const headers = ['Category', 'Metric', 'Value / Details'];
    const rows = [
      ['Financial Summary', 'Total Tender Value', `₹${reportData.financialSummary.totalTenderValue.toLocaleString('en-IN')}`],
      ['Financial Summary', 'Awarded Contract Value', `₹${reportData.financialSummary.totalAwardedValue.toLocaleString('en-IN')}`],
      ['Financial Summary', 'Work Order Budget', `₹${reportData.financialSummary.totalWorkOrderBudget.toLocaleString('en-IN')}`],
      ['Financial Summary', 'Actual Cost Spent', `₹${reportData.financialSummary.totalActualCost.toLocaleString('en-IN')}`],
      ...reportData.tendersByStatus.map((t: any) => ['Tenders', t._id, `${t.count} Tenders`]),
      ...reportData.vehiclesByStatus.map((v: any) => ['Fleet Vehicles', v._id, `${v.count} Vehicles`]),
      ...reportData.workOrdersByStatus.map((w: any) => ['Work Orders', w._id, `${w.count} Orders`]),
    ];

    const buffer = await PdfUtil.generateReport({
      title: 'Dada Mani Enterprise Operations Executive Report',
      headers,
      rows,
      summaryStats: [
        { label: 'Generated Date', value: new Date().toLocaleDateString('en-IN') },
        { label: 'System Status', value: 'Active Operational' },
      ],
    });

    return {
      buffer,
      filename: `dada_mani_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      contentType: 'application/pdf',
    };
  }
}
