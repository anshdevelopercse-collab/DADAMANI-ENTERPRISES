import { Response } from 'express';
import { ApiResponsePayload } from '../interfaces/common.interface.js';

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string = 'Operation successful',
    data?: T,
    meta?: any,
    statusCode: number = 200
  ): Response {
    const payload: ApiResponsePayload<T> = {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, message: string = 'Resource created successfully', data?: T): Response {
    return ApiResponse.success(res, message, data, undefined, 201);
  }

  static error(
    res: Response,
    message: string = 'An error occurred',
    code: string = 'ERROR',
    statusCode: number = 500,
    details?: any
  ): Response {
    const payload: ApiResponsePayload = {
      success: false,
      message,
      error: {
        code,
        details,
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(payload);
  }
}

export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'SYS_001', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errorCode: string = 'VAL_001', details?: any): ApiError {
    return new ApiError(message, 400, errorCode, details);
  }

  static unauthorized(message: string = 'Authentication required', errorCode: string = 'AUTH_001'): ApiError {
    return new ApiError(message, 401, errorCode);
  }

  static forbidden(message: string = 'Permission denied', errorCode: string = 'AUTH_002'): ApiError {
    return new ApiError(message, 403, errorCode);
  }

  static notFound(message: string = 'Resource not found', errorCode: string = 'RES_001'): ApiError {
    return new ApiError(message, 404, errorCode);
  }

  static conflict(message: string, errorCode: string = 'RES_002'): ApiError {
    return new ApiError(message, 409, errorCode);
  }

  static internal(message: string = 'Internal server error', details?: any): ApiError {
    return new ApiError(message, 500, 'SYS_001', details);
  }
}
