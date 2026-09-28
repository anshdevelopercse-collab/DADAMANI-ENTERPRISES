import { z } from 'zod';
import { UserRole } from '../constants/status.constant.js';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const ResendOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  role: z.enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER]),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  customPermissions: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER]).optional(),
  customPermissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
