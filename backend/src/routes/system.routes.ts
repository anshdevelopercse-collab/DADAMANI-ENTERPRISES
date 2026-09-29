import { Router } from 'express';
import multer from 'multer';
import {
  ImportExportController,
  DocumentController,
  NotificationController,
  SettingController,
} from '../controllers/system.controller.js';
import {
  authenticateJwt,
  requirePermission,
  requireRoles,
  uploadMiddleware,
  resolveFirmScope,
} from '../middlewares/index.js';
import { PERMISSIONS } from '../constants/permissions.constant.js';
import { UserRole } from '../constants/status.constant.js';

// Use memory storage for fast Excel inspection & buffer parsing
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// --- Import & Export Routes ---
export const importExportRouter = Router();
importExportRouter.use(authenticateJwt);
importExportRouter.use(resolveFirmScope);
importExportRouter.post('/inspect', requirePermission(PERMISSIONS.IMPORT_DATA), memoryUpload.single('file'), ImportExportController.inspect);
importExportRouter.post('/preview', requirePermission(PERMISSIONS.IMPORT_DATA), memoryUpload.single('file'), ImportExportController.preview);
importExportRouter.post('/execute', requirePermission(PERMISSIONS.IMPORT_DATA), memoryUpload.single('file'), ImportExportController.executeImport);
importExportRouter.get('/export', requirePermission(PERMISSIONS.EXPORT_DATA), ImportExportController.exportData);
importExportRouter.get('/history', requirePermission(PERMISSIONS.IMPORT_DATA), ImportExportController.getHistory);
importExportRouter.get('/template/:type', requirePermission(PERMISSIONS.IMPORT_DATA), ImportExportController.getTemplate);

// --- Documents Routes ---
export const documentRouter = Router();
documentRouter.use(authenticateJwt);
documentRouter.use(resolveFirmScope);
documentRouter.get('/', requirePermission(PERMISSIONS.DOCUMENT_READ), DocumentController.list);
documentRouter.post('/upload', requirePermission(PERMISSIONS.DOCUMENT_UPLOAD), uploadMiddleware.single('file'), DocumentController.upload);
documentRouter.get('/:id/download', requirePermission(PERMISSIONS.DOCUMENT_READ), DocumentController.download);
documentRouter.get('/:id/versions', requirePermission(PERMISSIONS.DOCUMENT_READ), DocumentController.getVersionHistory);
documentRouter.post('/:id/replace', requirePermission(PERMISSIONS.DOCUMENT_UPLOAD), uploadMiddleware.single('file'), DocumentController.replaceVersion);
documentRouter.delete('/:id', requirePermission(PERMISSIONS.DOCUMENT_DELETE), DocumentController.delete);

// --- Notification Routes ---
export const notificationRouter = Router();
notificationRouter.use(authenticateJwt);
notificationRouter.get('/', NotificationController.list);
notificationRouter.patch('/:id/read', NotificationController.markRead);
notificationRouter.patch('/read-all', NotificationController.markAllRead);

// --- Settings & Audit Routes ---
export const settingRouter = Router();
settingRouter.use(authenticateJwt);
settingRouter.get('/', SettingController.get);
settingRouter.put('/', requireRoles(UserRole.ADMIN), SettingController.update);
settingRouter.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_READ), SettingController.getAuditLogs);
settingRouter.post('/test-email', requireRoles(UserRole.ADMIN), SettingController.testEmail);
