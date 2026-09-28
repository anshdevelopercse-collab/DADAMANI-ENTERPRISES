import { describe, it, expect } from '@jest/globals';
import { OtpUtil } from '../utils/otp.util.js';
import { JwtUtil } from '../utils/jwt.util.js';

describe('Enterprise Authentication & Cryptography Tests', () => {
  it('should generate a 6-digit numeric OTP', () => {
    const otp = OtpUtil.generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should calculate expiry date exactly 5 minutes in future', () => {
    const now = new Date();
    const expiry = OtpUtil.getExpiryDate(5);
    const diffMins = Math.round((expiry.getTime() - now.getTime()) / 60000);
    expect(diffMins).toBe(5);
  });

  it('should sign and verify JWT tokens accurately', () => {
    const mockUser: any = {
      _id: '507f1f77bcf86cd799439011',
      email: 'ansh.developer.cse@gmail.com',
      role: 'Admin',
      name: 'Super Admin',
    };

    const tokens = JwtUtil.generateTokens(mockUser);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const decoded = JwtUtil.verifyAccessToken(tokens.accessToken);
    expect(decoded.id).toBe('507f1f77bcf86cd799439011');
    expect(decoded.email).toBe('ansh.developer.cse@gmail.com');
    expect(decoded.role).toBe('Admin');
  });
});
