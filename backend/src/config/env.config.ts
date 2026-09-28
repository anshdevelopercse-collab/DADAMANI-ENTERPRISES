import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dada_mani_erp',
  
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dada_mani_enterprise_access_secret_2026',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dada_mani_enterprise_refresh_secret_2026',
    ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '1d',
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SECURE: process.env.SMTP_SECURE === 'true',
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
    FROM: process.env.SMTP_FROM || 'no-reply@dadamani.com',
    FROM_NAME: process.env.SMTP_FROM_NAME || 'Dada Mani Enterprise',
  },

  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
  UPLOAD_DIR: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),

  SEED: {
    ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'ansh.developer.cse@gmail.com',
    ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456',
  }
};
