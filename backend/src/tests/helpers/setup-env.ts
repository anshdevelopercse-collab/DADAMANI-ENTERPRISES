import os from 'os';
import path from 'path';

// dotenv never overrides variables that are already set, so these values win
// over backend/.env for every test file.
process.env.NODE_ENV = 'test';
// Deliberately unreachable: nothing in the test suite may ever fall back to the
// configured Atlas cluster. Integration tests connect to mongodb-memory-server.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/never-used-by-tests';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-used-anywhere-real';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-used-anywhere-real';
process.env.JWT_ACCESS_EXPIRY = '1h';
process.env.JWT_REFRESH_EXPIRY = '1d';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
process.env.SMTP_USER = '';
process.env.SMTP_PASSWORD = '';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `dm-test-uploads-${process.pid}-${Date.now()}`);
process.env.MAX_FILE_SIZE_MB = '1';
