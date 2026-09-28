import nodemailer from 'nodemailer';
import { ENV } from './env.config.js';
import { logger } from './logger.config.js';

let transporter: nodemailer.Transporter;

export const initMailer = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  try {
    if (ENV.SMTP.HOST === 'smtp.ethereal.email' && (!ENV.SMTP.USER || ENV.SMTP.USER === 'dada.mani.erp@example.com')) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(`Ethereal Test Mailer initialized. Credentials: ${testAccount.user}`);
    } else {
      transporter = nodemailer.createTransport({
        host: ENV.SMTP.HOST,
        port: ENV.SMTP.PORT,
        secure: ENV.SMTP.SECURE,
        requireTLS: ENV.SMTP.PORT === 587,
        auth: {
          user: ENV.SMTP.USER,
          pass: ENV.SMTP.PASS,
        },
      });
      logger.info(`SMTP Mailer initialized on host ${ENV.SMTP.HOST}:${ENV.SMTP.PORT}`);
    }
  } catch (error: any) {
    logger.error(`Mailer init warning: ${error.message}. Creating fallback transporter.`);
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
};

export const getMailer = (): nodemailer.Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
};
