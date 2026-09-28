import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { ENV } from './config/env.config.js';
import { logger } from './config/logger.config.js';
import { initExpiryAlertCron } from './cron/expiry-alert.cron.js';
import { initMailer } from './config/mailer.config.js';

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Initialize Mailer
    await initMailer();

    // 3. Initialize Cron Jobs
    initExpiryAlertCron();

    // 4. Create App and HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    server.listen(ENV.PORT, () => {
      logger.info('================================================================');
      logger.info(`🚀 Dada Mani Enterprise Operations System Backend Started`);
      logger.info(`📡 API Server Running at: http://localhost:${ENV.PORT}${ENV.API_PREFIX}`);
      logger.info(`📚 Swagger Documentation at: http://localhost:${ENV.PORT}/docs`);
      logger.info(`🩺 Health Check at: http://localhost:${ENV.PORT}/health`);
      logger.info(`🔒 Environment: ${ENV.NODE_ENV}`);
      logger.info('================================================================');
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error(`Critical Server Startup Error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
