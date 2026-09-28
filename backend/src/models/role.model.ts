import mongoose, { Schema } from 'mongoose';

export interface IRoleDocument extends mongoose.Document {
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRoleDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, required: true }],
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRoleDocument>('Role', RoleSchema);
