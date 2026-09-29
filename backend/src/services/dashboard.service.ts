import {
  TenderRepository,
  AwardedTenderRepository,
  VehicleRepository,
  WorkOrderRepository,
  AuditLogRepository,
} from '../repositories/index.js';
import { TenderStatus, VehicleStatus, WorkOrderStatus } from '../constants/status.constant.js';
import { VehicleService } from './vehicle.service.js';
import { FirmScope } from '../interfaces/common.interface.js';
import { buildFirmFilter } from '../middlewares/firm-scope.middleware.js';
import { AwardedTender } from '../models/awarded-tender.model.js';
import { Invoice } from '../models/invoice.model.js';
import { ContractAdvance } from '../models/contract-advance.model.js';
import { Company } from '../models/company.model.js';

export class DashboardService {
  private tenderRepo = new TenderRepository();
  private awardedRepo = new AwardedTenderRepository();
  private vehicleRepo = new VehicleRepository();
  private workOrderRepo = new WorkOrderRepository();
  private auditRepo = new AuditLogRepository();
  private vehicleService = new VehicleService();

  async getDashboardMetrics(firmScope?: FirmScope): Promise<any> {
    const scopeFilter = buildFirmFilter(firmScope);
    const [
      totalTenders,
      draftTenders,
      submittedTenders,
      awardedTendersCount,
      rejectedTenders,
      cancelledTenders,
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalWorkOrders,
      activeWorkOrders,
      completedWorkOrders,
      awardedList,
      recentLogs,
      upcomingExpiries,
    ] = await Promise.all([
      this.tenderRepo.count({ isArchived: false, ...scopeFilter }),
      this.tenderRepo.count({ status: TenderStatus.DRAFT, isArchived: false, ...scopeFilter }),
      this.tenderRepo.count({ status: TenderStatus.SUBMITTED, isArchived: false, ...scopeFilter }),
      this.tenderRepo.count({ status: TenderStatus.AWARDED, isArchived: false, ...scopeFilter }),
      this.tenderRepo.count({ status: TenderStatus.REJECTED, isArchived: false, ...scopeFilter }),
      this.tenderRepo.count({ status: TenderStatus.CANCELLED, isArchived: false, ...scopeFilter }),
      this.vehicleRepo.count(buildFirmFilter(firmScope, 'homeEntity')),
      this.vehicleRepo.count({ status: VehicleStatus.ACTIVE, ...buildFirmFilter(firmScope, 'homeEntity') }),
      this.vehicleRepo.count({ status: VehicleStatus.MAINTENANCE, ...buildFirmFilter(firmScope, 'homeEntity') }),
      this.workOrderRepo.count(scopeFilter),
      this.workOrderRepo.count({ status: { $in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] }, ...scopeFilter }),
      this.workOrderRepo.count({ status: WorkOrderStatus.COMPLETED, ...scopeFilter }),
      this.awardedRepo.find(scopeFilter, 'awardValue projectedProfit awardedDate executionStatus entity'),
      this.auditRepo.find({}, undefined, { createdAt: -1 }, 10),
      this.vehicleService.getUpcomingComplianceExpiries(30),
    ]);

    // Financial calculations
    const totalAwardedRevenue = awardedList.reduce((acc, curr) => acc + (curr.awardValue || 0), 0);
    const totalProjectedProfit = awardedList.reduce((acc, curr) => acc + (curr.projectedProfit || 0), 0);
    const averageProfitMargin = totalAwardedRevenue > 0 ? ((totalProjectedProfit / totalAwardedRevenue) * 100).toFixed(1) : '0';

    // Chart Data 1: Tender Status Distribution
    const tenderStatusDistribution = [
      { name: 'Submitted', value: submittedTenders, color: '#0284c7' },
      { name: 'Awarded', value: awardedTendersCount, color: '#10b981' },
      { name: 'Draft', value: draftTenders, color: '#64748b' },
      { name: 'Rejected', value: rejectedTenders, color: '#ef4444' },
      { name: 'Cancelled', value: cancelledTenders, color: '#f59e0b' },
    ];

    // Chart Data 2: Monthly Revenue (Last 6 months projection)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthIdx = (currentMonthIdx - i + 12) % 12;
      const monthName = months[monthIdx];
      // Aggregate real or calculated monthly award value
      const val = awardedList
        .filter((a) => a.awardedDate && new Date(a.awardedDate).getMonth() === monthIdx)
        .reduce((sum, item) => sum + (item.awardValue || 0), 0);

      monthlyRevenue.push({
        month: monthName,
        revenue: val > 0 ? val / 100000 : 0, // in Lakhs
        profit: val > 0 ? (val * 0.18) / 100000 : 0,
      });
    }

    // Chart Data 3: Vehicle Fleet Utilization
    const fleetStatusData = [
      { status: 'Active on Site', count: activeVehicles, color: '#10b981' },
      { status: 'Under Maintenance', count: maintenanceVehicles, color: '#f59e0b' },
      { status: 'Idle / Available', count: Math.max(0, totalVehicles - activeVehicles - maintenanceVehicles), color: '#6366f1' },
    ];

    // Per-firm financial breakdown for multi-firm summary cards
    const [revenueByFirm, invoicedByFirm, advancesByFirm, firmsList] = await Promise.all([
      AwardedTender.aggregate([
        { $match: { entity: { $exists: true, $ne: null } } },
        { $group: { _id: '$entity', revenue: { $sum: '$awardValue' } } },
      ]),
      Invoice.aggregate([
        { $match: { entity: { $exists: true, $ne: null } } },
        { $group: { _id: '$entity', invoiced: { $sum: '$amount' } } },
      ]),
      ContractAdvance.aggregate([
        { $match: { entity: { $exists: true, $ne: null } } },
        { $group: { _id: '$entity', advances: { $sum: '$amount' } } },
      ]),
      Company.find({ isActive: true }).select('_id name code isPrimary').lean(),
    ]);

    const financialByFirm = firmsList.map((firm) => {
      const fid = firm._id.toString();
      return {
        firmId: fid,
        firmName: firm.name,
        firmCode: firm.code,
        isPrimary: firm.isPrimary,
        revenue: revenueByFirm.find((r: any) => r._id?.toString() === fid)?.revenue ?? 0,
        invoiced: invoicedByFirm.find((r: any) => r._id?.toString() === fid)?.invoiced ?? 0,
        advances: advancesByFirm.find((r: any) => r._id?.toString() === fid)?.advances ?? 0,
      };
    });

    return {
      cards: {
        totalTenders,
        submittedTenders,
        awardedTenders: awardedTendersCount,
        rejectedTenders,
        cancelledTenders,
        totalVehicles,
        activeVehicles,
        totalRevenue: totalAwardedRevenue,
        projectedProfit: totalProjectedProfit,
        profitMargin: averageProfitMargin,
        totalWorkOrders,
        activeWorkOrders,
        completedWorkOrders,
        complianceAlertsCount: upcomingExpiries.length,
      },
      charts: {
        tenderStatusDistribution,
        monthlyRevenue,
        fleetStatusData,
      },
      recentActivity: recentLogs,
      upcomingExpiries: upcomingExpiries.slice(0, 5),
      financialByFirm,
    };
  }
}
