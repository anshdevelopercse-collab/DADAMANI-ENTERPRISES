import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { ReportsService } from '../services/reports.service.js';

const reportsService = new ReportsService();

export class ReportsController {
  static async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getDashboardReports(req.query, req.firmScope);
      ApiResponse.success(res, 'Reports data generated', data);
    } catch (error) {
      next(error);
    }
  }

  static async exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.exportReportsExcel(req.query, req.firmScope);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  static async exportPdf(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.exportReportsPdf(req.query, req.firmScope);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}
