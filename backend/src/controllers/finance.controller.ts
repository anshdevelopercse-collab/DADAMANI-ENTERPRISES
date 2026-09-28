import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { InvoiceService } from '../services/invoice.service.js';
import { ContractAdvanceService } from '../services/contract-advance.service.js';
import { GemFeeService } from '../services/gem-fee.service.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const invoiceService = new InvoiceService();
const advanceService = new ContractAdvanceService();
const gemFeeService = new GemFeeService();
const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));

import { AdvanceAdjustment } from '../models/advance-adjustment.model.js';

export class InvoiceController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await invoiceService.list(req.query as any);
      ApiResponse.success(res, 'Invoices retrieved', result.data, result.pagination);
    } catch (error) { next(error); }
  }
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoiceService.getById(getId(req.params.id));
      ApiResponse.success(res, 'Invoice retrieved', invoice);
    } catch (error) { next(error); }
  }
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoiceService.create(req.body, req.user?._id.toString()!);
      await logAudit(req, 'WORK_ORDERS', AuditAction.CREATE, `Created invoice ${invoice.invoiceNumber}`, invoice._id.toString());
      ApiResponse.created(res, 'Invoice created', invoice);
    } catch (error) { next(error); }
  }
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoiceService.update(getId(req.params.id), req.body);
      await logAudit(req, 'WORK_ORDERS', AuditAction.UPDATE, `Updated invoice ${invoice.invoiceNumber}`, invoice._id.toString());
      ApiResponse.success(res, 'Invoice updated', invoice);
    } catch (error) { next(error); }
  }
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      await invoiceService.delete(id);
      await logAudit(req, 'WORK_ORDERS', AuditAction.DELETE, `Deleted invoice ${id}`, id);
      ApiResponse.success(res, 'Invoice deleted');
    } catch (error) { next(error); }
  }

  static async getAdjustments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adjustments = await AdvanceAdjustment.find({ invoice: getId(req.params.id) })
        .populate('advance', 'recipientName amount totalAdjusted')
        .sort({ date: -1 })
        .lean();
      ApiResponse.success(res, 'Invoice adjustments retrieved', adjustments);
    } catch (error) { next(error); }
  }
}

export class ContractAdvanceController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await advanceService.list(req.query as any);
      ApiResponse.success(res, 'Contract advances retrieved', result.data, result.pagination);
    } catch (error) { next(error); }
  }
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const advance = await advanceService.getById(getId(req.params.id));
      ApiResponse.success(res, 'Contract advance retrieved', advance);
    } catch (error) { next(error); }
  }
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const advance = await advanceService.create(req.body, req.user?._id.toString()!);
      await logAudit(req, 'WORK_ORDERS', AuditAction.CREATE, `Recorded contract advance of ${advance.amount} to ${advance.recipientName}`, advance._id.toString());
      ApiResponse.created(res, 'Contract advance recorded', advance);
    } catch (error) { next(error); }
  }
  static async getAdjustments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adjustments = await advanceService.getAdjustments(getId(req.params.id));
      ApiResponse.success(res, 'Advance adjustments retrieved', adjustments);
    } catch (error) { next(error); }
  }
  static async createAdjustment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoice, amountAdjusted, notes } = req.body;
      const adjustment = await advanceService.createAdjustment(getId(req.params.id), invoice, amountAdjusted, req.user?._id.toString()!, notes);
      await logAudit(
        req,
        'WORK_ORDERS',
        AuditAction.UPDATE,
        `Adjusted ${amountAdjusted} of advance ${req.params.id} against invoice ${invoice}`,
        adjustment._id.toString()
      );
      ApiResponse.created(res, 'Advance adjustment recorded', adjustment);
    } catch (error) { next(error); }
  }
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      await advanceService.delete(id);
      await logAudit(req, 'WORK_ORDERS', AuditAction.DELETE, `Deleted contract advance ${id}`, id);
      ApiResponse.success(res, 'Contract advance deleted');
    } catch (error) { next(error); }
  }
}

export class GemFeeController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await gemFeeService.list(req.query as any);
      ApiResponse.success(res, 'GEM fees retrieved', result.data, result.pagination);
    } catch (error) { next(error); }
  }
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fee = await gemFeeService.getById(getId(req.params.id));
      ApiResponse.success(res, 'GEM fee retrieved', fee);
    } catch (error) { next(error); }
  }
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fee = await gemFeeService.create(req.body, req.user?._id.toString()!);
      await logAudit(req, 'WORK_ORDERS', AuditAction.CREATE, `Recorded GEM fee of ${fee.amount} for contract ${fee.workOrder}`, fee._id.toString());
      ApiResponse.created(res, 'GEM fee recorded', fee);
    } catch (error) { next(error); }
  }
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      await gemFeeService.delete(id);
      await logAudit(req, 'WORK_ORDERS', AuditAction.DELETE, `Deleted GEM fee ${id}`, id);
      ApiResponse.success(res, 'GEM fee deleted');
    } catch (error) { next(error); }
  }
}
