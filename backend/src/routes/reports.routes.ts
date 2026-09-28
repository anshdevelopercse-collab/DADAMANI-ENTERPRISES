import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller.js';
import { authenticateJwt, requirePermission } from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';

export const reportsRouter = Router();
reportsRouter.use(authenticateJwt);

reportsRouter.get('/', requirePermission(PERMISSIONS.TENDER_READ), ReportsController.getReports);
reportsRouter.get('/export-excel', requirePermission(PERMISSIONS.EXPORT_DATA), ReportsController.exportExcel);
reportsRouter.get('/export-pdf', requirePermission(PERMISSIONS.EXPORT_DATA), ReportsController.exportPdf);
