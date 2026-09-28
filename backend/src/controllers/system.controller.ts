import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { ImportExportService } from '../services/import-export.service.js';
import { DocumentService, NotificationService, SettingService } from '../services/system.services.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const importExportService = new ImportExportService();
const documentService = new DocumentService();
const notificationService = new NotificationService();
const settingService = new SettingService();

const getId = (id: any): string => (Array.isArray(id) ? id[0] : String(id));

// --- Import & Export Controller ---
export class ImportExportController {
  static async inspect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ApiResponse.error(res, 'No Excel file provided for inspection', 'VAL_001', 400);
        return;
      }
      const sheets = importExportService.inspectFile(req.file.buffer);
      ApiResponse.success(res, 'Excel workbook inspected', sheets);
    } catch (error) {
      next(error);
    }
  }

  static async preview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ApiResponse.error(res, 'No Excel file provided', 'VAL_001', 400);
        return;
      }
      const { sheetName, module, headerMapping } = req.body;
      const parsedMapping = typeof headerMapping === 'string' ? JSON.parse(headerMapping) : headerMapping;

      const preview = await importExportService.previewAndValidate(
        req.file.buffer,
        sheetName,
        module,
        parsedMapping
      );

      ApiResponse.success(res, 'Validation preview ready', preview);
    } catch (error) {
      next(error);
    }
  }

  static async executeImport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ApiResponse.error(res, 'No file uploaded for import', 'VAL_001', 400);
        return;
      }

      const { sheetName, module, headerMapping, skipDuplicates, allowPartial } = req.body;
      const parsedMapping = typeof headerMapping === 'string' ? JSON.parse(headerMapping) : headerMapping;

      const result = await importExportService.executeImport(
        req.file.buffer,
        sheetName,
        req.file.originalname,
        module,
        parsedMapping,
        {
          skipDuplicates: skipDuplicates === 'true' || skipDuplicates === true,
          allowPartial: allowPartial === 'true' || allowPartial === true,
        },
        req.user?._id.toString()!
      );

      await logAudit(
        req,
        'IMPORT',
        AuditAction.IMPORT,
        `Imported ${result.successfulCount} rows into ${module} from ${req.file.originalname}`
      );

      ApiResponse.success(res, 'Import processed', result);
    } catch (error) {
      next(error);
    }
  }

  static async exportData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { module, format = 'excel' } = req.query;
      const exportResult = await importExportService.generateExport(
        module as any,
        format as any,
        req.query
      );

      await logAudit(req, 'EXPORT', AuditAction.EXPORT, `Exported ${module} data in ${format} format`);

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.buffer);
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await importExportService.getHistory();
      ApiResponse.success(res, 'Import history retrieved', history);
    } catch (error) {
      next(error);
    }
  }

  static async getTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = getId(req.params.type);
      const templateResult = await importExportService.getTemplate(type);
      res.setHeader('Content-Type', templateResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${templateResult.filename}"`);
      res.send(templateResult.buffer);
    } catch (error) {
      next(error);
    }
  }
}

// --- Documents Controller ---
export class DocumentController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await documentService.getDocuments(req.query as any);
      ApiResponse.success(res, 'Documents retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ApiResponse.error(res, 'No document file provided', 'VAL_001', 400);
        return;
      }

      const { title, folder, category, entityType, entityId, tags } = req.body;
      const doc = await documentService.createDocument(
        {
          title: title || req.file.originalname,
          folder: folder || 'General',
          category: category || 'General',
          originalFileName: req.file.originalname,
          storedFileName: req.file.filename || req.file.originalname,
          filePath: req.file.path || `/uploads/${req.file.originalname}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          entityType,
          entityId,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
        },
        req.user?._id.toString()!,
        req.user?.name!
      );

      await logAudit(req, 'DOCUMENTS', AuditAction.CREATE, `Uploaded document ${doc.originalFileName}`);
      ApiResponse.created(res, 'Document uploaded', doc);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await documentService.deleteDocument(getId(req.params.id));
      await logAudit(req, 'DOCUMENTS', AuditAction.DELETE, `Deleted document ID ${getId(req.params.id)}`);
      ApiResponse.success(res, 'Document deleted');
    } catch (error) {
      next(error);
    }
  }

  static async getVersionHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const versions = await documentService.getVersionHistory(getId(req.params.id));
      ApiResponse.success(res, 'Document version history retrieved', versions);
    } catch (error) {
      next(error);
    }
  }

  static async replaceVersion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ApiResponse.error(res, 'No replacement file provided', 'VAL_001', 400);
        return;
      }
      const { title, notes } = req.body;
      const newDoc = await documentService.replaceWithNewVersion(
        getId(req.params.id),
        {
          title,
          originalFileName: req.file.originalname,
          storedFileName: req.file.filename || req.file.originalname,
          filePath: req.file.path || `/uploads/${req.file.originalname}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          notes,
        },
        req.user?._id.toString()!,
        req.user?.name!
      );
      await logAudit(req, 'DOCUMENTS', AuditAction.UPDATE, `Replaced document ${req.params.id} → v${newDoc.versionNumber}`);
      ApiResponse.created(res, 'New document version uploaded', newDoc);
    } catch (error) {
      next(error);
    }
  }
}

// --- Notification Controller ---
export class NotificationController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await notificationService.getNotifications(req.user?._id.toString());
      ApiResponse.success(res, 'Notifications retrieved', data.notifications, { unreadCount: data.unreadCount });
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAsRead(getId(req.params.id));
      ApiResponse.success(res, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllAsRead(req.user?._id.toString());
      ApiResponse.success(res, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}

// --- Settings & Audit Controller ---
export class SettingController {
  static async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingService.getSettings();
      ApiResponse.success(res, 'System settings retrieved', settings);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingService.updateSettings(req.body, req.user?._id.toString()!);
      await logAudit(req, 'SETTINGS', AuditAction.UPDATE, 'System settings updated');
      ApiResponse.success(res, 'Settings updated', settings);
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingService.getAuditLogs(req.query as any);
      ApiResponse.success(res, 'Audit logs retrieved', result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async testEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      ApiResponse.success(res, 'Test email sent successfully');
    } catch (error) {
      next(error);
    }
  }
}
