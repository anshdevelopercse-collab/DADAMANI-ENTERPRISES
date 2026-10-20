import { Document, Types } from 'mongoose';
import { TaskStatus, TaskPriority } from '../constants/status.constant.js';

export interface IChecklistItem {
  _id?: Types.ObjectId;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface ITaskReminder {
  enabled: boolean;
  minutesBefore: number;
  dailyReminder: boolean;
  deadlineReminderSent: boolean;
  overdueNotified: boolean;
  lastDailyReminderSentAt?: Date;
}

export interface ITask {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  checklistItems: IChecklistItem[];
  reminder: ITaskReminder;
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  completedAt?: Date;
  isPersonal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document {}
