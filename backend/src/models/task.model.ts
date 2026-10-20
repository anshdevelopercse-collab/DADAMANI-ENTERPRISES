import mongoose, { Schema } from 'mongoose';
import { ITaskDocument } from '../interfaces/task.interface.js';
import { TaskStatus, TaskPriority } from '../constants/status.constant.js';

const ChecklistItemSchema = new Schema<any>(
  {
    title: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: false }
);

const TaskReminderSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    minutesBefore: { type: Number, default: 60, min: 0 },
    dailyReminder: { type: Boolean, default: false },
    deadlineReminderSent: { type: Boolean, default: false },
    overdueNotified: { type: Boolean, default: false },
    lastDailyReminderSentAt: { type: Date },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITaskDocument>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    checklistItems: [ChecklistItemSchema],
    reminder: { type: TaskReminderSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    isPersonal: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

TaskSchema.index({ createdBy: 1, status: 1, dueDate: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ dueDate: 1, status: 1 });

export const Task = mongoose.model<ITaskDocument>('Task', TaskSchema);
