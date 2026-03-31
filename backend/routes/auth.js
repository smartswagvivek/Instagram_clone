import express from 'express';

import {
  checkAvailability,
  signup,
  login,
  refreshSession,
  logout,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  loginValidator,
  refreshTokenValidator,
  signupValidator,
  availabilityValidator,
} from '../validators/authValidators.js';

const router = express.Router();

router.get('/check-availability', availabilityValidator, validate, checkAvailability);
router.post('/register', authLimiter, signupValidator, validate, signup);
router.post('/signup', authLimiter, signupValidator, validate, signup);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/refresh-token', refreshTokenValidator, validate, refreshSession);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
