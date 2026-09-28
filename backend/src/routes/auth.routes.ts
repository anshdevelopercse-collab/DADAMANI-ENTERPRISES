import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import {
  validateBody,
  authRateLimiter,
  authenticateJwt,
} from '../middlewares/index.js';
import {
  LoginSchema,
  VerifyOtpSchema,
  ResendOtpSchema,
  ChangePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', authRateLimiter, validateBody(LoginSchema), AuthController.login);
router.post('/verify-otp', authRateLimiter, validateBody(VerifyOtpSchema), AuthController.verifyOtp);
router.post('/resend-otp', authRateLimiter, validateBody(ResendOtpSchema), AuthController.resendOtp);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/me', authenticateJwt, AuthController.getMe);
router.post('/change-password', authenticateJwt, validateBody(ChangePasswordSchema), AuthController.changePassword);

export default router;
