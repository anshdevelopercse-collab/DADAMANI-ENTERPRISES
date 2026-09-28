import { Router } from 'express';
import authRouter from './auth.routes.js';
import {
  tenderRouter,
  awardedRouter,
  vehicleRouter,
  workOrderRouter,
  userRouter,
  dashboardRouter,
} from './operation.routes.js';
import {
  importExportRouter,
  documentRouter,
  notificationRouter,
  settingRouter,
} from './system.routes.js';
import { reportsRouter } from './reports.routes.js';
import { workforceRouter } from './workforce.routes.js';
import { invoiceRouter, advanceRouter, gemFeeRouter } from './finance.routes.js';
import { companyRouter } from './company.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/tenders', tenderRouter);
router.use('/awarded-tenders', awardedRouter);
router.use('/vehicles', vehicleRouter);
router.use('/work-orders', workOrderRouter);
router.use('/users', userRouter);
router.use('/import-export', importExportRouter);
router.use('/documents', documentRouter);
router.use('/notifications', notificationRouter);
router.use('/settings', settingRouter);
router.use('/reports', reportsRouter);
router.use('/workforce', workforceRouter);
router.use('/invoices', invoiceRouter);
router.use('/contract-advances', advanceRouter);
router.use('/gem-fees', gemFeeRouter);
router.use('/companies', companyRouter);

export default router;
