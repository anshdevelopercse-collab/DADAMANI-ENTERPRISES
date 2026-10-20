import { Types } from 'mongoose';
import { Task } from '../models/task.model.js';
import { TaskRepository, UserRepository } from '../repositories/index.js';
import { ITaskDocument } from '../interfaces/task.interface.js';
import { TaskStatus, TaskPriority, NotificationType, NotificationPriority } from '../constants/status.constant.js';
import { ApiError } from '../utils/api-response.util.js';
import { NotificationService } from './system.services.js';
import { logger } from '../config/logger.config.js';

const notificationService = new NotificationService();

export class TaskService {
  private taskRepo = new TaskRepository();
  private userRepo = new UserRepository();

  async getTasks(userId: string, scope: string): Promise<ITaskDocument[]> {
    const uid = new Types.ObjectId(userId);
    let filter: any = {};

    switch (scope) {
      case 'personal':
        filter = { createdBy: uid, isPersonal: true };
        break;
      case 'assigned-to-me':
        filter = { assignedTo: uid, isPersonal: false };
        break;
      case 'assigned-by-me':
        filter = { createdBy: uid, isPersonal: false };
        break;
      case 'mine':
        filter = { $or: [{ createdBy: uid }, { assignedTo: uid }] };
        break;
      case 'all':
        filter = {};
        break;
      default:
        filter = { $or: [{ createdBy: uid }, { assignedTo: uid }] };
    }

    return Task.find(filter)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort({ dueDate: 1, priority: -1 })
      .exec();
  }

  async getById(taskId: string, userId: string, isAdmin: boolean): Promise<ITaskDocument> {
    const task = await Task.findById(taskId)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .exec();

    if (!task) throw ApiError.notFound('Task not found');

    const uid = userId.toString();
    const canAccess =
      isAdmin ||
      task.createdBy._id.toString() === uid ||
      task.assignedTo?._id?.toString() === uid;

    if (!canAccess) throw ApiError.forbidden('Access denied');

    return task;
  }

  async createPersonalTask(
    data: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate: Date;
      checklistItems?: { title: string; isCompleted?: boolean }[];
      reminder?: Partial<ITaskDocument['reminder']>;
    },
    creatorId: string
  ): Promise<ITaskDocument> {
    return this.taskRepo.create({
      ...data,
      createdBy: new Types.ObjectId(creatorId),
      isPersonal: true,
      status: TaskStatus.PENDING,
      checklistItems: data.checklistItems?.map((ci) => ({ ...ci, isCompleted: ci.isCompleted ?? false })) ?? [],
      reminder: {
        enabled: data.reminder?.enabled ?? false,
        minutesBefore: data.reminder?.minutesBefore ?? 60,
        dailyReminder: data.reminder?.dailyReminder ?? false,
        deadlineReminderSent: false,
        overdueNotified: false,
      },
    } as any);
  }

  async assignTask(
    data: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate: Date;
      checklistItems?: { title: string; isCompleted?: boolean }[];
      reminder?: Partial<ITaskDocument['reminder']>;
      assignedTo: string;
    },
    adminId: string
  ): Promise<ITaskDocument> {
    const assignee = await this.userRepo.findById(data.assignedTo);
    if (!assignee) throw ApiError.notFound('Assignee user not found');

    const task = await this.taskRepo.create({
      ...data,
      createdBy: new Types.ObjectId(adminId),
      assignedTo: new Types.ObjectId(data.assignedTo),
      assignedAt: new Date(),
      isPersonal: false,
      status: TaskStatus.PENDING,
      checklistItems: data.checklistItems?.map((ci) => ({ ...ci, isCompleted: ci.isCompleted ?? false })) ?? [],
      reminder: {
        enabled: data.reminder?.enabled ?? false,
        minutesBefore: data.reminder?.minutesBefore ?? 60,
        dailyReminder: data.reminder?.dailyReminder ?? false,
        deadlineReminderSent: false,
        overdueNotified: false,
      },
    } as any);

    try {
      await notificationService.createNotification(
        `New Task Assigned: ${task.title}`,
        `You have been assigned a new task "${task.title}" with ${task.priority} priority. Due: ${task.dueDate.toLocaleDateString()}.`,
        NotificationType.TASK_ASSIGNED,
        NotificationPriority.HIGH,
        data.assignedTo,
        `/tasks`
      );
    } catch (err: any) {
      logger.warn(`Failed to send task assignment notification: ${err.message}`);
    }

    return task;
  }

  async updateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      status?: TaskStatus;
      dueDate?: Date;
      reminder?: Partial<ITaskDocument['reminder']>;
    },
    userId: string,
    isAdmin: boolean
  ): Promise<ITaskDocument> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    const uid = userId.toString();
    const isOwner = task.createdBy.toString() === uid;
    const isAssignee = task.assignedTo?.toString() === uid;

    if (!isAdmin && !isOwner && !isAssignee) throw ApiError.forbidden('Access denied');

    const toSet: any = { ...updates };

    if (updates.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      toSet.completedAt = new Date();
    }
    if (updates.reminder) {
      const existing = task.reminder ?? {};
      toSet.reminder = { ...existing, ...updates.reminder };
    }

    return this.taskRepo.updateById(taskId, toSet) as Promise<ITaskDocument>;
  }

  async deleteTask(taskId: string, userId: string, isAdmin: boolean): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    if (!isAdmin && task.createdBy.toString() !== userId) {
      throw ApiError.forbidden('Only the creator or an Admin can delete a task');
    }

    await this.taskRepo.deleteById(taskId);
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    updates: { title?: string; isCompleted?: boolean },
    userId: string,
    isAdmin: boolean
  ): Promise<ITaskDocument> {
    const task = await Task.findById(taskId).exec();
    if (!task) throw ApiError.notFound('Task not found');

    const uid = userId.toString();
    const canAccess =
      isAdmin ||
      task.createdBy.toString() === uid ||
      task.assignedTo?.toString() === uid;

    if (!canAccess) throw ApiError.forbidden('Access denied');

    const item = task.checklistItems.find((ci) => ci._id?.toString() === itemId);
    if (!item) throw ApiError.notFound('Checklist item not found');

    if (updates.title !== undefined) item.title = updates.title;
    if (updates.isCompleted !== undefined) {
      item.isCompleted = updates.isCompleted;
      item.completedAt = updates.isCompleted ? new Date() : undefined;
    }

    await task.save();
    return task;
  }

  async addChecklistItem(
    taskId: string,
    item: { title: string },
    userId: string,
    isAdmin: boolean
  ): Promise<ITaskDocument> {
    const task = await Task.findById(taskId).exec();
    if (!task) throw ApiError.notFound('Task not found');

    const uid = userId.toString();
    if (!isAdmin && task.createdBy.toString() !== uid && task.assignedTo?.toString() !== uid) {
      throw ApiError.forbidden('Access denied');
    }

    task.checklistItems.push({ title: item.title, isCompleted: false } as any);
    await task.save();
    return task;
  }

  async deleteChecklistItem(
    taskId: string,
    itemId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<ITaskDocument> {
    const task = await Task.findById(taskId).exec();
    if (!task) throw ApiError.notFound('Task not found');

    const uid = userId.toString();
    if (!isAdmin && task.createdBy.toString() !== uid) {
      throw ApiError.forbidden('Only the creator or an Admin can remove checklist items');
    }

    task.checklistItems = task.checklistItems.filter((ci) => ci._id?.toString() !== itemId) as any;
    await task.save();
    return task;
  }
}
