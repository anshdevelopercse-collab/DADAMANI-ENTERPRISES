import { Request } from 'express';
import { IUserDocument } from './user.interface.js';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: any;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponsePayload<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: string;
}

export interface FirmScope {
  kind: 'all' | 'firm';
  firmId?: string;
  /** For Restricted users requesting 'all': constrained to these firm IDs only */
  allowedFirmIds?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  token?: string;
  firmScope?: FirmScope;
}
