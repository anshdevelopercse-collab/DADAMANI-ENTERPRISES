import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller.js';
import { authenticateJwt, requirePermission } from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';

export const companyRouter = Router();
companyRouter.use(authenticateJwt);
// Public-to-auth context endpoint — every authenticated user needs this for firm switcher
companyRouter.get('/context', CompanyController.context);
companyRouter.get('/', requirePermission(PERMISSIONS.COMPANY_READ), CompanyController.list);
companyRouter.get('/:id', requirePermission(PERMISSIONS.COMPANY_READ), CompanyController.getById);
companyRouter.post('/', requirePermission(PERMISSIONS.COMPANY_MANAGE), CompanyController.create);
companyRouter.put('/:id', requirePermission(PERMISSIONS.COMPANY_MANAGE), CompanyController.update);
companyRouter.delete('/:id', requirePermission(PERMISSIONS.COMPANY_MANAGE), CompanyController.delete);
