import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { AuthenticatedRequest } from '../interfaces/common.interface.js';
import { computeEffectivePermissions } from '../utils/permissions.util.js';
import { logAudit } from '../middlewares/index.js';
import { AuditAction } from '../constants/status.constant.js';

const authService = new AuthService();

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

      const result = await authService.login(email, password, clientIp);

      await logAudit(
        { user: result.user, ip: clientIp, headers: req.headers } as any,
        'AUTH',
        result.requiresOtp ? AuditAction.OTP_GENERATE : AuditAction.LOGIN,
        `Login ${result.requiresOtp ? 'initiated with OTP' : 'successful'} for ${email}`
      );

      ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;
      const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

      const result = await authService.verifyOtp(email, otp, clientIp);

      await logAudit(
        { user: result.user, ip: clientIp, headers: req.headers } as any,
        'AUTH',
        AuditAction.OTP_VERIFY,
        `Admin OTP verification successful for ${email}`
      );

      ApiResponse.success(res, 'Admin verification successful', result);
    } catch (error) {
      next(error);
    }
  }

  static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const message = await authService.resendOtp(email);
      ApiResponse.success(res, message);
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      ApiResponse.success(res, 'Session refreshed successfully', tokens);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      // Defense in depth: authenticateJwt no longer selects '+password', but
      // this endpoint never serializes the raw document either way — a
      // profile response should never be able to carry a password hash.
      const { password, otp, ...safeUser } = user.toObject();
      ApiResponse.success(res, 'Profile retrieved', { ...safeUser, permissions: computeEffectivePermissions(user) });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user?._id.toString()!, currentPassword, newPassword);

      await logAudit(req, 'AUTH', AuditAction.PASSWORD_CHANGE, `Password updated for user ${req.user?.email}`);

      ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}
