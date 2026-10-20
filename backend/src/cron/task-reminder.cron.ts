import cron from 'node-cron';
import { Task } from '../models/task.model.js';
import { NotificationService } from '../services/system.services.js';
import { NotificationType, NotificationPriority, TaskStatus } from '../constants/status.constant.js';
import { logger } from '../config/logger.config.js';

const notificationService = new NotificationService();

async function processReminders() {
  const now = new Date();

  try {
    const tasks = await Task.find({
      status: { $ne: TaskStatus.COMPLETED },
      'reminder.enabled': true,
    }).exec();

    for (const task of tasks) {
      const recipientId = (task.assignedTo ?? task.createdBy)?.toString();
      if (!recipientId) continue;

      const msUntilDue = task.dueDate.getTime() - now.getTime();
      const minutesUntilDue = msUntilDue / 60000;
      const isOverdue = msUntilDue < 0;

      // Deadline proximity reminder
      if (
        !task.reminder.deadlineReminderSent &&
        minutesUntilDue >= 0 &&
        minutesUntilDue <= task.reminder.minutesBefore
      ) {
        try {
          await notificationService.createNotification(
            `Task Due Soon: ${task.title}`,
            `Your task "${task.title}" is due in ${Math.ceil(minutesUntilDue)} minute(s).`,
            NotificationType.TASK_REMINDER,
            NotificationPriority.HIGH,
            recipientId,
            `/tasks`
          );
          await Task.updateOne({ _id: task._id }, { 'reminder.deadlineReminderSent': true });
        } catch (err: any) {
          logger.warn(`Deadline reminder failed for task ${task._id}: ${err.message}`);
        }
      }

      // Overdue notification (sent once)
      if (isOverdue && !task.reminder.overdueNotified) {
        try {
          await notificationService.createNotification(
            `Task Overdue: ${task.title}`,
            `Your task "${task.title}" was due on ${task.dueDate.toLocaleDateString()} and is now overdue.`,
            NotificationType.TASK_OVERDUE,
            NotificationPriority.CRITICAL,
            recipientId,
            `/tasks`
          );
          await Task.updateOne({ _id: task._id }, { 'reminder.overdueNotified': true });
        } catch (err: any) {
          logger.warn(`Overdue notification failed for task ${task._id}: ${err.message}`);
        }
      }

      // Daily recurring reminder (once per calendar day)
      if (task.reminder.dailyReminder && !isOverdue) {
        const lastSent = task.reminder.lastDailyReminderSentAt;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const alreadySentToday = lastSent && lastSent >= today;

        if (!alreadySentToday) {
          try {
            await notificationService.createNotification(
              `Daily Reminder: ${task.title}`,
              `Reminder: task "${task.title}" is due on ${task.dueDate.toLocaleDateString()}.`,
              NotificationType.TASK_REMINDER,
              NotificationPriority.MEDIUM,
              recipientId,
              `/tasks`
            );
            await Task.updateOne({ _id: task._id }, { 'reminder.lastDailyReminderSentAt': now });
          } catch (err: any) {
            logger.warn(`Daily reminder failed for task ${task._id}: ${err.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    logger.error(`Task reminder cron error: ${err.message}`);
  }
}

export const initTaskReminderCron = () => {
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Running Task Reminder Cron...');
    await processReminders();
  });
  logger.info('Task reminder cron scheduled (every 30 minutes).');
};
