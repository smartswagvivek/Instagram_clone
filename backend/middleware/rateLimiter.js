import rateLimit from 'express-rate-limit';

// General API rate limiter
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 250),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 15),
  message: 'Too many login attempts, please try again later',
});

export const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.POST_RATE_LIMIT_MAX || 40),
  message: 'You are creating posts too frequently',
});

export default rateLimiter;
