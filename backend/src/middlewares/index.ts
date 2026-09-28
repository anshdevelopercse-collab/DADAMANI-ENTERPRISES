import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError, ApiResponse } from '../utils/api-response.util.js';
import { logger } from '../config/logger.config.js';
import { ENV } from '../config/env.config.js';
import { AuditLog } from '../models/audit-log.model.js';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';

// Re-export auth middlewares
export * from './auth.middleware.js';

// --- Zod Validation Middleware ---
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(ApiError.badRequest('Validation failed', 'VAL_001', issues));
      } else {
        next(error);
      }
    }
  };
};

// --- Rate Limiting ---
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Multer File Upload Setup ---
const uploadDirectory = ENV.UPLOAD_DIR;
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const mongoSanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const sanitize = (obj: any) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/png',
      'image/jpeg',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|xlsx|xls|png|jpg|jpeg)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, Excel (.xlsx/.xls) and Images (PNG/JPG) are allowed.'));
    }
  },
});

// --- Audit Logger Helper ---
export const logAudit = async (
  req: AuthenticatedRequest,
  module: 'AUTH' | 'TENDERS' | 'AWARDED' | 'VEHICLES' | 'WORK_ORDERS' | 'USERS' | 'IMPORT' | 'EXPORT' | 'DOCUMENTS' | 'SETTINGS' | 'SYSTEM',
  action: string,
  description: string,
  entityId?: string,
  oldValues?: any,
  newValues?: any,
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS'
) => {
  try {
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name || 'System / Anonymous',
      userRole: req.user?.role || 'Guest',
      userEmail: req.user?.email || 'N/A',
      action,
      module,
      description,
      entityId,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Client',
      oldValues,
      newValues,
      status,
    });
  } catch (err: any) {
    logger.error(`Failed to record audit log: ${err.message}`);
  }
};

// --- Global Error Handling Middleware ---
export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error(`API Error: ${err.message}`, { stack: err.stack });

  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.errorCode, err.statusCode, err.details);
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const key = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.error(
      res,
      `A record with this ${key} already exists.`,
      'RES_002',
      409,
      err.keyValue
    );
  }

  // Cast error (Invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(res, `Invalid resource identifier: ${err.value}`, 'VAL_001', 400);
  }

  return ApiResponse.error(
    res,
    ENV.NODE_ENV === 'production' ? 'Internal server error occurred' : err.message,
    'SYS_001',
    500
  );
};
