import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse, ApiError } from '../utils/api-response.util.js';
import { Company } from '../models/company.model.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));

export class CompanyController {
  /** Returns the active firms list + the primary firm ID for firm-switcher initialisation. */
  static async context(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const firms = await Company.find({ isActive: true })
        .select('_id name code isPrimary')
        .sort({ isPrimary: -1, name: 1 })
        .lean();
      const primary = firms.find((f) => f.isPrimary) ?? firms[0] ?? null;
      ApiResponse.success(res, 'Firm context', { firms, primaryFirmId: primary?._id ?? null });
    } catch (error) { next(error); }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search = '', page = 1, limit = 20, active } = req.query as any;
      const filter: any = {};
      if (search) filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
      if (active !== undefined) filter.isActive = active === 'true';

      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        Company.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
        Company.countDocuments(filter),
      ]);
      ApiResponse.success(res, 'Companies retrieved', data, {
        total, page: Number(page), limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) { next(error); }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await Company.findById(getId(req.params.id)).lean();
      if (!company) throw ApiError.notFound('Company not found');
      ApiResponse.success(res, 'Company retrieved', company);
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await Company.create(req.body);
      await logAudit(req, 'SETTINGS', AuditAction.CREATE, `Created company ${company.name}`, company._id.toString());
      ApiResponse.created(res, 'Company created', company);
    } catch (error) { next(error); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      const company = await Company.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
      if (!company) throw ApiError.notFound('Company not found');
      await logAudit(req, 'SETTINGS', AuditAction.UPDATE, `Updated company ${company.name}`, id);
      ApiResponse.success(res, 'Company updated', company);
    } catch (error) { next(error); }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req.params.id);
      const company = await Company.findByIdAndDelete(id).lean();
      if (!company) throw ApiError.notFound('Company not found');
      await logAudit(req, 'SETTINGS', AuditAction.DELETE, `Deleted company ${company.name}`, id);
      ApiResponse.success(res, 'Company deleted');
    } catch (error) { next(error); }
  }
}
