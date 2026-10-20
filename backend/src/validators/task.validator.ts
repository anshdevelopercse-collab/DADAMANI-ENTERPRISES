import { z } from 'zod';
import { TaskPriority, TaskStatus } from '../constants/status.constant.js';

const checklistItemSchema = z.object({
  title: z.string().min(1).max(200),
  isCompleted: z.boolean().optional().default(false),
});

const reminderSchema = z.object({
  enabled: z.boolean().optional().default(false),
  minutesBefore: z.number().int().min(0).max(10080).optional().default(60),
  dailyReminder: z.boolean().optional().default(false),
});

export const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: z.string().or(z.date()).transform((v) => new Date(v)),
  checklistItems: z.array(checklistItemSchema).optional().default([]),
  reminder: reminderSchema.optional().default({}),
  assignedTo: z.string().optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().or(z.date()).transform((v) => new Date(v)).optional(),
  reminder: reminderSchema.optional(),
});

export const TaskAssignSchema = z.object({
  assignedTo: z.string().min(1, 'assignedTo user id is required'),
});

export const ChecklistItemUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
});
