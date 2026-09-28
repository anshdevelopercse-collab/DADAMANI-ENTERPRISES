import { Document, Types } from 'mongoose';
import { UserRole } from '../constants/status.constant.js';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: UserRole | string;
  customPermissions?: string[];
  phone?: string;
  avatar?: string;
  department?: string;
  designation?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  otp?: {
    code: string;
    expiresAt: Date;
    attempts: number;
  };
  lastLoginAt?: Date;
  lastLoginIp?: string;
  temporaryPasswordExpiry?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: string): boolean;
}
