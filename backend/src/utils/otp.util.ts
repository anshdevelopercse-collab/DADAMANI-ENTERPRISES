import crypto from 'crypto';

export class OtpUtil {
  /**
   * Generates a secure 6-digit numeric OTP
   */
  static generateOtp(): string {
    const buffer = crypto.randomBytes(3);
    const num = (buffer.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
  }

  /**
   * Returns OTP expiration date (5 minutes from now)
   */
  static getExpiryDate(minutes: number = 5): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
    return expiresAt;
  }
}
