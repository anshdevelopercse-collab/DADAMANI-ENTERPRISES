import { describe, it, expect } from '@jest/globals';
import { ApiResponse, ApiError } from '../utils/api-response.util.js';
import { ExcelUtil } from '../utils/excel.util.js';

describe('Utility Functions Unit Tests', () => {
  describe('ApiResponse & ApiError', () => {
    it('should create custom ApiError with correct properties', () => {
      const err = ApiError.badRequest('Invalid tender amount', 'VAL_002', { field: 'estimatedValue' });
      expect(err.message).toBe('Invalid tender amount');
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe('VAL_002');
      expect(err.details).toEqual({ field: 'estimatedValue' });
    });

    it('should create unauthorized error', () => {
      const err = ApiError.unauthorized('Token expired');
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe('AUTH_001');
    });

    it('should create forbidden error', () => {
      const err = ApiError.forbidden();
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Permission denied');
    });
  });

  describe('ExcelUtil', () => {
    it('should expose exportToExcel and inspectWorkbook static methods', () => {
      expect(typeof ExcelUtil.exportToExcel).toBe('function');
      expect(typeof ExcelUtil.inspectWorkbook).toBe('function');
    });

    it('should generate an Excel buffer with enterprise header formatting', async () => {
      const title = 'Test Tenders';
      const columns = [
        { header: 'Tender ID', key: 'tenderNumber', width: 20 },
        { header: 'Title', key: 'title', width: 30 },
      ];
      const data = [{ tenderNumber: 'TND-001', title: 'Road Construction' }];

      const buffer = await ExcelUtil.exportToExcel(title, columns, data);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('SMTP Mailer Integration', () => {
    it('should initialize Nodemailer transporter with Brevo SMTP config', async () => {
      const { initMailer } = await import('../config/mailer.config.js');
      const { ENV } = await import('../config/env.config.js');
      const transporter = await initMailer();
      expect(transporter).toBeDefined();
      expect(ENV.SMTP.HOST).toBe('smtp-relay.brevo.com');
      expect(ENV.SMTP.PORT).toBe(587);
    });
  });
});
