import { getMailer, initMailer } from '../config/mailer.config.js';
import { ENV } from '../config/env.config.js';
import { logger } from '../config/logger.config.js';
import { emailTemplates } from '../emails/templates.js';

export class EmailService {
  private static async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      await initMailer();
      const mailer = getMailer();
      const fromAddress = ENV.SMTP.FROM_NAME
        ? `"${ENV.SMTP.FROM_NAME}" <${ENV.SMTP.FROM}>`
        : ENV.SMTP.FROM;
      const info = await mailer.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });

      logger.info(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  static async sendOtpEmail(to: string, name: string, otpCode: string): Promise<boolean> {
    const template = emailTemplates.otp(otpCode, name);
    return this.sendMail(to, template.subject, template.html);
  }

  static async sendWelcomeEmail(to: string, name: string, tempPass: string, role: string): Promise<boolean> {
    const template = emailTemplates.welcome(name, to, tempPass, role);
    return this.sendMail(to, template.subject, template.html);
  }

  static async sendVehicleExpiryAlert(
    to: string,
    vehicleReg: string,
    expiryType: string,
    expiryDate: string,
    daysLeft: number
  ): Promise<boolean> {
    const template = emailTemplates.vehicleExpiryAlert(vehicleReg, expiryType, expiryDate, daysLeft);
    return this.sendMail(to, template.subject, template.html);
  }

  static async sendTenderAssignedEmail(
    to: string,
    managerName: string,
    tenderNumber: string,
    title: string,
    deadline: string
  ): Promise<boolean> {
    const template = emailTemplates.tenderAssigned(managerName, tenderNumber, title, deadline);
    return this.sendMail(to, template.subject, template.html);
  }

  static async sendWorkOrderAssignedEmail(
    to: string,
    managerName: string,
    orderNumber: string,
    title: string,
    siteLocation: string
  ): Promise<boolean> {
    const template = emailTemplates.workOrderAssigned(managerName, orderNumber, title, siteLocation);
    return this.sendMail(to, template.subject, template.html);
  }
}
