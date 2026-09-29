import path from 'path';
import {
  DocumentRecordRepository,
  NotificationRepository,
  SettingRepository,
  AuditLogRepository,
} from '../repositories/index.js';
import { IDocumentRecordDocument, INotificationDocument, ISettingDocument } from '../interfaces/audit.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { PaginationParams, PaginatedResult, FirmScope } from '../interfaces/common.interface.js';
import { NotificationPriority, NotificationType } from '../constants/status.constant.js';
import { assertFirmAccess } from '../middlewares/firm-scope.middleware.js';

/**
 * Builds a Mongoose filter for the Document.firms[] array field.
 * Legacy documents (firms = [] or absent) are always accessible to everyone.
 * Firm-tagged documents are only accessible to authorized firms.
 */
function buildDocumentFirmFilter(firmScope?: FirmScope): Record<string, any> {
  if (!firmScope) return {};

  const legacyConditions = [
    { firms: { $exists: false } },
    { firms: { $size: 0 } },
  ];

  if (firmScope.kind === 'firm' && firmScope.firmId) {
    return { $or: [...legacyConditions, { firms: firmScope.firmId }] };
  }

  if (firmScope.kind === 'all' && firmScope.allowedFirmIds?.length) {
    return { $or: [...legacyConditions, { firms: { $in: firmScope.allowedFirmIds } }] };
  }

  return {};
}

/** Sanitizes an uploaded filename to prevent path traversal. */
function safeName(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

// --- Document Service ---
export class DocumentService {
  private docRepo = new DocumentRecordRepository();

  async getDocuments(params: PaginationParams & { showAllVersions?: string }, firmScope?: FirmScope): Promise<PaginatedResult<IDocumentRecordDocument>> {
    const filter: any = {
      isArchived: false,
      ...buildDocumentFirmFilter(firmScope),
      // Show existing docs (no field) + latest versions; hide superseded versions
    };
    if (params.showAllVersions !== 'true') {
      filter.$and = [
        ...(filter.$and ?? []),
        { $or: [{ isLatestVersion: true }, { isLatestVersion: { $exists: false } }] },
      ];
    }
    if (params.search) {
      const safeSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { originalFileName: { $regex: safeSearch, $options: 'i' } },
        { folder: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (params.folder) filter.folder = params.folder;
    if (params.entityType) filter.entityType = params.entityType;

    return this.docRepo.paginate(filter, params, [{ path: 'uploadedBy', select: 'name email' }]);
  }

  async getDocumentById(id: string, firmScope?: FirmScope): Promise<IDocumentRecordDocument> {
    const doc = await this.docRepo.findById(id);
    if (!doc) throw ApiError.notFound('Document not found');
    // Documents use firms[], treat empty array same as legacy (no restriction)
    const primaryFirm = doc.firms?.[0] ?? null;
    assertFirmAccess(primaryFirm, firmScope);
    return doc;
  }

  async createDocument(data: any, uploadedBy: string, uploaderName: string): Promise<IDocumentRecordDocument> {
    const safeOriginal = safeName(data.originalFileName || 'file');
    return this.docRepo.create({
      ...data,
      originalFileName: safeOriginal,
      uploadedBy: uploadedBy as any,
      uploaderName,
    });
  }

  async deleteDocument(id: string, firmScope?: FirmScope): Promise<void> {
    const doc = await this.docRepo.findById(id);
    if (!doc) throw ApiError.notFound('Document not found');
    const primaryFirm = doc.firms?.[0] ?? null;
    assertFirmAccess(primaryFirm, firmScope);
    await this.docRepo.deleteById(id);
  }

  async getVersionHistory(id: string, firmScope?: FirmScope): Promise<IDocumentRecordDocument[]> {
    const doc = await this.docRepo.findById(id);
    if (!doc) throw ApiError.notFound('Document not found');
    const primaryFirm = doc.firms?.[0] ?? null;
    assertFirmAccess(primaryFirm, firmScope);
    const rootId = doc.parentDoc ?? doc._id;
    return this.docRepo.find(
      { $or: [{ _id: rootId }, { parentDoc: rootId }], isArchived: false },
      undefined,
      { versionNumber: 1 }
    );
  }

  async replaceWithNewVersion(
    currentDocId: string,
    fileData: {
      title?: string;
      originalFileName: string;
      storedFileName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      notes?: string;
    },
    uploadedBy: string,
    uploaderName: string,
    firmScope?: FirmScope
  ): Promise<IDocumentRecordDocument> {
    const current = await this.docRepo.findById(currentDocId);
    if (!current) throw ApiError.notFound('Document not found');

    // Firm authorization check before allowing replacement
    const primaryFirm = current.firms?.[0] ?? null;
    assertFirmAccess(primaryFirm, firmScope);

    // Sanitize filename to prevent path traversal
    const safeOriginal = safeName(fileData.originalFileName);

    // Mark current as no longer latest
    await this.docRepo.updateById(currentDocId, { isLatestVersion: false });

    const rootId = current.parentDoc ?? current._id;
    const nextVersion = current.versionNumber + 1;

    return this.docRepo.create({
      title: fileData.title || current.title,
      folder: current.folder,
      category: current.category,
      originalFileName: safeOriginal,
      storedFileName: fileData.storedFileName,
      filePath: fileData.filePath,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      uploadedBy: uploadedBy as any,
      uploaderName,
      tags: current.tags,
      entityType: current.entityType,
      entityId: current.entityId,
      firms: current.firms,
      isArchived: false,
      parentDoc: rootId as any,
      versionNumber: nextVersion,
      isLatestVersion: true,
    });
  }
}

// --- Notification Service ---
export class NotificationService {
  private notifRepo = new NotificationRepository();

  async getNotifications(userId?: string, limit: number = 20): Promise<{ notifications: INotificationDocument[]; unreadCount: number }> {
    const filter: any = {
      $or: [{ recipient: userId }, { recipient: null }],
    };

    const [notifications, unreadCount] = await Promise.all([
      this.notifRepo.find(filter, undefined, { createdAt: -1 }, limit),
      this.notifRepo.count({ ...filter, isRead: false }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(id: string): Promise<void> {
    await this.notifRepo.updateById(id, { isRead: true });
  }

  async markAllAsRead(userId?: string): Promise<void> {
    const filter: any = {
      $or: [{ recipient: userId }, { recipient: null }],
      isRead: false,
    };
    await this.notifRepo.updateOne(filter, { $set: { isRead: true } });
  }

  async createNotification(
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    recipientId?: string,
    link?: string
  ): Promise<INotificationDocument> {
    return this.notifRepo.create({
      title,
      message,
      type,
      priority,
      recipient: recipientId as any,
      link,
      isRead: false,
    });
  }
}

// --- Setting & Audit Service ---
export class SettingService {
  private settingRepo = new SettingRepository();
  private auditRepo = new AuditLogRepository();

  async getSettings(): Promise<ISettingDocument> {
    return this.settingRepo.getSettings();
  }

  async updateSettings(data: any, userId: string): Promise<ISettingDocument> {
    const settings = await this.getSettings();
    Object.assign(settings, data, { updatedBy: userId });
    await settings.save();
    return settings;
  }

  async getAuditLogs(params: PaginationParams): Promise<any> {
    const filter: any = {};
    if (params.search) {
      filter.$or = [
        { description: { $regex: params.search, $options: 'i' } },
        { userName: { $regex: params.search, $options: 'i' } },
        { action: { $regex: params.search, $options: 'i' } },
      ];
    }
    if (params.module) filter.module = params.module;
    if (params.action) filter.action = params.action;

    return this.auditRepo.paginate(filter, params);
  }
}
