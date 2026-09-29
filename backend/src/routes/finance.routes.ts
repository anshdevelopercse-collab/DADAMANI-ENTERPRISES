import { Router } from 'express';
import { InvoiceController, ContractAdvanceController, GemFeeController } from '../controllers/finance.controller.js';
import { authenticateJwt, requirePermission, validateBody, resolveFirmScope } from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';
import {
  InvoiceCreateSchema,
  ContractAdvanceCreateSchema,
  AdvanceAdjustmentCreateSchema,
  GemFeeCreateSchema,
} from '../validators/finance.validator.js';

export const invoiceRouter = Router();
invoiceRouter.use(authenticateJwt);
invoiceRouter.use(resolveFirmScope);
invoiceRouter.get('/', requirePermission(PERMISSIONS.INVOICE_READ), InvoiceController.list);
invoiceRouter.get('/:id', requirePermission(PERMISSIONS.INVOICE_READ), InvoiceController.getById);
invoiceRouter.post('/', requirePermission(PERMISSIONS.INVOICE_CREATE), validateBody(InvoiceCreateSchema), InvoiceController.create);
invoiceRouter.put('/:id', requirePermission(PERMISSIONS.INVOICE_UPDATE), InvoiceController.update);
invoiceRouter.get('/:id/adjustments', requirePermission(PERMISSIONS.INVOICE_READ), InvoiceController.getAdjustments);
invoiceRouter.delete('/:id', requirePermission(PERMISSIONS.INVOICE_DELETE), InvoiceController.delete);

export const advanceRouter = Router();
advanceRouter.use(authenticateJwt);
advanceRouter.use(resolveFirmScope);
advanceRouter.get('/', requirePermission(PERMISSIONS.ADVANCE_READ), ContractAdvanceController.list);
advanceRouter.get('/:id', requirePermission(PERMISSIONS.ADVANCE_READ), ContractAdvanceController.getById);
advanceRouter.post('/', requirePermission(PERMISSIONS.ADVANCE_CREATE), validateBody(ContractAdvanceCreateSchema), ContractAdvanceController.create);
advanceRouter.get('/:id/adjustments', requirePermission(PERMISSIONS.ADVANCE_READ), ContractAdvanceController.getAdjustments);
advanceRouter.post('/:id/adjustments', requirePermission(PERMISSIONS.ADVANCE_ADJUST), validateBody(AdvanceAdjustmentCreateSchema), ContractAdvanceController.createAdjustment);
advanceRouter.delete('/:id', requirePermission(PERMISSIONS.ADVANCE_DELETE), ContractAdvanceController.delete);

export const gemFeeRouter = Router();
gemFeeRouter.use(authenticateJwt);
gemFeeRouter.use(resolveFirmScope);
gemFeeRouter.get('/', requirePermission(PERMISSIONS.GEMFEE_READ), GemFeeController.list);
gemFeeRouter.get('/:id', requirePermission(PERMISSIONS.GEMFEE_READ), GemFeeController.getById);
gemFeeRouter.post('/', requirePermission(PERMISSIONS.GEMFEE_CREATE), validateBody(GemFeeCreateSchema), GemFeeController.create);
gemFeeRouter.delete('/:id', requirePermission(PERMISSIONS.GEMFEE_DELETE), GemFeeController.delete);
