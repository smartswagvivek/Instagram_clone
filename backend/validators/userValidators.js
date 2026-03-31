import { body, param, query } from 'express-validator';

export const userIdParamValidator = [param('id').isMongoId()];

export const updateProfileValidator = [
  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-z0-9_.]+$/),
  body('fullName').optional({ checkFalsy: true }).trim(),
  body('bio').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('website').optional({ checkFalsy: true }).isURL(),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('isPrivate').optional().isBoolean(),
];

export const searchUsersValidator = [query('q').trim().isLength({ min: 1 })];
