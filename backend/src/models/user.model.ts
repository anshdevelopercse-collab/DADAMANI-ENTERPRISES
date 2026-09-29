import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUserDocument } from '../interfaces/user.interface.js';
import { UserRole } from '../constants/status.constant.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.constant.js';

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.VIEWER,
      index: true,
    },
    customPermissions: [{ type: String }],
    firmAccessMode: { type: String, enum: ['All', 'Restricted'], default: 'All' },
    firmAccess: [{ type: Schema.Types.ObjectId, ref: 'Company' }],
    phone: { type: String, trim: true },
    avatar: { type: String },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: true },
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
    },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    temporaryPasswordExpiry: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  // Avoid double-hashing if password is already a valid bcrypt hash
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password)) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.hasPermission = function (permission: string): boolean {
  if (this.role === UserRole.ADMIN) return true;
  if (this.customPermissions && this.customPermissions.includes(permission)) {
    return true;
  }
  const defaultRolePerms = DEFAULT_ROLE_PERMISSIONS[this.role] || [];
  return defaultRolePerms.includes(permission);
};

export const User = mongoose.model<IUserDocument>('User', UserSchema);
