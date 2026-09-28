import cron from 'node-cron';
import { VehicleService } from '../services/vehicle.service.js';
import { NotificationService } from '../services/system.services.js';
import { EmailService } from '../services/email.service.js';
import { UserRepository } from '../repositories/index.js';
import { NotificationPriority, NotificationType, UserRole } from '../constants/status.constant.js';
import { logger } from '../config/logger.config.js';

const vehicleService = new VehicleService();
const notificationService = new NotificationService();
const userRepo = new UserRepository();

export const initExpiryAlertCron = () => {
  // Run daily at 07:00 AM
  cron.schedule('0 7 * * *', async () => {
    logger.info('Running Daily Fleet Compliance & Expiry Alert Cron Job...');
    try {
      const alerts = await vehicleService.getUpcomingComplianceExpiries(30);
      if (alerts.length === 0) {
        logger.info('No upcoming vehicle document expiries within 30 days.');
        return;
      }

      const adminsAndManagers = await userRepo.find({
        role: { $in: [UserRole.ADMIN, UserRole.MANAGER] },
        isActive: true,
      });

      for (const alert of alerts) {
        // System Notification
        await notificationService.createNotification(
          `Vehicle Document Expiry: ${alert.registrationNumber}`,
          `${alert.documentType} is expiring in ${alert.daysLeft} days (${new Date(alert.expiryDate).toLocaleDateString()}) for ${alert.makeModel} at ${alert.currentLocation}.`,
          NotificationType.EXPIRY_ALERT,
          alert.daysLeft <= 7 ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
          undefined,
          `/vehicles/${alert.vehicleId}`
        );

        // Email Alert to Admins & Fleet Managers
        for (const user of adminsAndManagers) {
          if (user.email) {
            await EmailService.sendVehicleExpiryAlert(
              user.email,
              alert.registrationNumber,
              alert.documentType,
              new Date(alert.expiryDate).toLocaleDateString(),
              alert.daysLeft
            );
          }
        }
      }

      logger.info(`Processed ${alerts.length} compliance expiry alerts.`);
    } catch (error: any) {
      logger.error(`Error executing Expiry Alert Cron: ${error.message}`);
    }
  });
};
