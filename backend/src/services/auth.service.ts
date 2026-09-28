import { UserRepository } from '../repositories/index.js';
import { UserRole, AuditAction } from '../constants/status.constant.js';
import { ApiError } from '../utils/api-response.util.js';
import { ERROR_CODES } from '../constants/error-codes.constant.js';
import { JwtUtil } from '../utils/jwt.util.js';
import { OtpUtil } from '../utils/otp.util.js';
import { EmailService } from './email.service.js';
import { IUserDocument } from '../interfaces/user.interface.js';
import { computeEffectivePermissions } from '../utils/permissions.util.js';

export class AuthService {
  private userRepo = new UserRepository();

  /**
   * Enterprise Login Handler
   * Admin: Validates password -> Generates 6-digit OTP -> Sends email -> Requires OTP verification
   * Manager / Viewer: Direct authentication -> Issues JWT
   */
  async login(email: string, password: string, clientIp: string = '127.0.0.1'): Promise<{
    requiresOtp: boolean;
    user?: Partial<IUserDocument>;
    accessToken?: string;
    refreshToken?: string;
    message: string;
  }> {
    const user = await this.userRepo.findByEmailWithPassword(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated. Please contact your system administrator.', ERROR_CODES.UNAUTHORIZED);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Admin Role requires Email OTP Verification
    if (user.role === UserRole.ADMIN) {
      const otpCode = OtpUtil.generateOtp();
      const expiresAt = OtpUtil.getExpiryDate(5);

      user.otp = {
        code: otpCode,
        expiresAt,
        attempts: 0,
      };
      await user.save();

      // Dispatch OTP Email
      await EmailService.sendOtpEmail(user.email, user.name, otpCode);

      return {
        requiresOtp: true,
        message: `Security OTP sent to registered email (${user.email}). Valid for 5 minutes.`,
      };
    }

    // Direct Login for Manager & Viewer
    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp;
    await user.save();

    const tokens = JwtUtil.generateTokens(user);

    return {
      requiresOtp: false,
      user: {
        id: (user._id as any).toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        customPermissions: user.customPermissions,
        permissions: computeEffectivePermissions(user),
        department: user.department,
        designation: user.designation,
        avatar: user.avatar,
      } as any,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      message: 'Login successful',
    };
  }

  /**
   * Verify Admin OTP
   */
  async verifyOtp(email: string, otpCode: string, clientIp: string = '127.0.0.1'): Promise<{
    user: Partial<IUserDocument>;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userRepo.findByEmailWithPassword(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid authentication session', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (!user.otp || !user.otp.code) {
      throw ApiError.badRequest('No OTP request active for this account', ERROR_CODES.OTP_INVALID_OR_EXPIRED);
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      user.otp = undefined;
      await user.save();
      throw ApiError.badRequest('OTP has expired. Please request a new code.', ERROR_CODES.OTP_INVALID_OR_EXPIRED);
    }

    if (user.otp.attempts >= 3) {
      user.otp = undefined;
      await user.save();
      throw ApiError.badRequest('Maximum OTP verification attempts exceeded. Please login again.', ERROR_CODES.OTP_MAX_ATTEMPTS);
    }

    if (user.otp.code !== otpCode) {
      user.otp.attempts += 1;
      await user.save();
      throw ApiError.badRequest(`Invalid OTP code. ${3 - user.otp.attempts} attempt(s) remaining.`, ERROR_CODES.OTP_INVALID_OR_EXPIRED);
    }

    // Successful OTP verification
    user.otp = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp;
    await user.save();

    const tokens = JwtUtil.generateTokens(user);

    return {
      user: {
        id: (user._id as any).toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        customPermissions: user.customPermissions,
        permissions: computeEffectivePermissions(user),
        department: user.department,
        designation: user.designation,
        avatar: user.avatar,
      } as any,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Resend Admin OTP
   */
  async resendOtp(email: string): Promise<string> {
    const user = await this.userRepo.findByEmailWithPassword(email);
    if (!user || user.role !== UserRole.ADMIN) {
      throw ApiError.badRequest('Invalid request for OTP resend');
    }

    const otpCode = OtpUtil.generateOtp();
    const expiresAt = OtpUtil.getExpiryDate(5);

    user.otp = {
      code: otpCode,
      expiresAt,
      attempts: 0,
    };
    await user.save();

    await EmailService.sendOtpEmail(user.email, user.name, otpCode);
    return `New OTP has been dispatched to ${user.email}`;
  }

  /**
   * Refresh JWT Session
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = JwtUtil.verifyRefreshToken(refreshToken);
      const user = await this.userRepo.findById(payload.id);
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('User not found or inactive');
      }

      return JwtUtil.generateTokens(user);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token', ERROR_CODES.TOKEN_EXPIRED);
    }
  }

  /**
   * Password Update
   */
  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await this.userRepo.findById(userId, '+password');
    if (!user) throw ApiError.notFound('User not found');

    const isMatch = await user.comparePassword(currentPass);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.password = newPass;
    await user.save();
  }
}
