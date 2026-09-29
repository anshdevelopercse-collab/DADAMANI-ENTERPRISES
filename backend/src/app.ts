import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { ENV } from './config/env.config.js';
import { swaggerSpec } from './config/swagger.config.js';
import masterRouter from './routes/index.js';
import { globalErrorHandler, apiRateLimiter, mongoSanitizeMiddleware } from './middlewares/index.js';
import { ApiResponse } from './utils/api-response.util.js';

export const createApp = (): Express => {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow all in dev or matched origins
        if (!origin || ENV.NODE_ENV === 'development' || ENV.CORS_ORIGIN.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Firm-Scope'],
    })
  );

  // Request Logging
  app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Body Parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(mongoSanitizeMiddleware);

  // Global Rate Limiter
  app.use('/api', apiRateLimiter);

  // Swagger Documentation UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Health Check
  app.get('/health', (_req: Request, res: Response) => {
    ApiResponse.success(res, 'Dada Mani Enterprise Operations System API is healthy', {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: ENV.NODE_ENV,
    });
  });

  // Master API Routes
  app.use(ENV.API_PREFIX, masterRouter);

  // 404 Route Handler
  app.use((_req: Request, res: Response) => {
    ApiResponse.error(res, 'Endpoint route not found', 'RES_001', 404);
  });

  // Global Error Handler
  app.use(globalErrorHandler);

  return app;
};
