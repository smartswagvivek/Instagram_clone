import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });

export const signRefreshToken = (user) =>
  jwt.sign({ id: user._id, type: 'refresh' }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d',
  });

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const parseTokenExpiry = (value) => {
  if (!value) return 30 * 24 * 60 * 60 * 1000;

  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};
