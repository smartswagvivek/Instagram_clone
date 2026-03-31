import { body, query } from 'express-validator';

export const signupValidator = [
  body('email').isEmail().normalizeEmail(),
  body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-z0-9_.]+$/),
  body('password').isLength({ min: 6 }),
  body('fullName').optional({ checkFalsy: true }).trim(),
  body('isPrivate').optional().isBoolean(),
];

export const loginValidator = [
  body('identifier').trim().notEmpty(),
  body('password').notEmpty(),
];

export const refreshTokenValidator = [body('refreshToken').notEmpty()];

export const availabilityValidator = [
  query('email').optional().isEmail().normalizeEmail(),
  query('username')
    .optional()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-z0-9_.]+$/),
];
