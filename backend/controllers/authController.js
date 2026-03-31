import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  hashToken,
  parseTokenExpiry,
  signAccessToken,
  signRefreshToken,
} from '../utils/token.js';

const createSession = async (user, req) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + parseTokenExpiry(process.env.REFRESH_TOKEN_EXPIRE));

  user.refreshTokens = (user.refreshTokens || [])
    .filter((session) => new Date(session.expiresAt) > new Date())
    .concat({
      tokenHash: hashToken(refreshToken),
      expiresAt,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      lastUsedAt: new Date(),
    });

  await user.save();

  return {
    accessToken,
    refreshToken,
    user: user.getPublicProfile(),
  };
};

export const signup = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const username = req.body.username?.trim().toLowerCase();
  const { password, fullName = '', isPrivate = false } = req.body;

  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existing) {
    const error = new Error(
      existing.email === email ? 'Email already registered' : 'Username already taken'
    );
    error.statusCode = 400;
    throw error;
  }

  let user;
  try {
    user = await User.create({
      email,
      username,
      password,
      fullName,
      isPrivate,
    });
  } catch (dbError) {
    if (dbError?.code === 11000) {
      const duplicateField = Object.keys(dbError.keyPattern || {})[0];
      const error = new Error(
        duplicateField === 'email' ? 'Email already registered' : 'Username already taken'
      );
      error.statusCode = 400;
      throw error;
    }

    throw dbError;
  }

  const response = await createSession(user, req);
  res.status(201).json(response);
});

export const checkAvailability = asyncHandler(async (req, res) => {
  const email = req.query.email?.trim().toLowerCase();
  const username = req.query.username?.trim().toLowerCase();

  if (!email && !username) {
    const error = new Error('Email or username is required');
    error.statusCode = 400;
    throw error;
  }

  const [emailUser, usernameUser] = await Promise.all([
    email ? User.findOne({ email }).select('_id') : null,
    username ? User.findOne({ username }).select('_id') : null,
  ]);

  res.json({
    email: {
      value: email || '',
      available: email ? !emailUser : true,
      message: emailUser ? 'Email already registered' : 'Email is available',
    },
    username: {
      value: username || '',
      available: username ? !usernameUser : true,
      message: usernameUser ? 'Username already taken' : 'Username is available',
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  }).select('+password +refreshTokens');

  if (!user || !(await user.matchPassword(password))) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account is deactivated');
    error.statusCode = 403;
    throw error;
  }

  user.lastLogin = new Date();
  const response = await createSession(user, req);
  res.json(response);
});

export const refreshSession = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (_error) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 401;
    throw error;
  }

  const refreshHash = hashToken(refreshToken);
  const existingSession = user.refreshTokens.find((session) => session.tokenHash === refreshHash);

  if (!existingSession) {
    const error = new Error('Refresh session expired');
    error.statusCode = 401;
    throw error;
  }

  user.refreshTokens = user.refreshTokens.filter((session) => session.tokenHash !== refreshHash);
  const response = await createSession(user, req);
  res.json(response);
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    user.refreshTokens = user.refreshTokens.filter(
      (session) => session.tokenHash !== hashToken(refreshToken)
    );
    await user.save();
  }

  res.json({ message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('followers', 'username fullName profilePicture')
    .populate('following', 'username fullName profilePicture')
    .populate('followRequestsReceived', 'username fullName profilePicture isPrivate')
    .populate('followRequestsSent', 'username fullName profilePicture isPrivate');

  res.json(user);
});
