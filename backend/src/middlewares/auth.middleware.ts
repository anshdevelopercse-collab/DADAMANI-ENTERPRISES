import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { JwtUtil } from '../utils/jwt.util.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/api-response.util.js';
import { ERROR_CODES } from '../constants/error-codes.constant.js';

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token missing or malformed', ERROR_CODES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = JwtUtil.verifyAccessToken(token);
    } catch (err: any) {
      throw ApiError.unauthorized('Invalid or expired authentication session', ERROR_CODES.TOKEN_EXPIRED);
    }

    // Never select '+password' here — req.user is attached to every
    // authenticated request and any handler that serializes it (e.g. GET
    // /auth/me) would otherwise leak the bcrypt hash in the API response.
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User account deactivated or not found', ERROR_CODES.UNAUTHORIZED);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return next(ApiError.forbidden(`Action requires one of the following roles: [${roles.join(', ')}]`));
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (req.user.hasPermission(permission)) {
      return next();
    }

    return next(ApiError.forbidden(`Missing required permission: ${permission}`));
  };
};
