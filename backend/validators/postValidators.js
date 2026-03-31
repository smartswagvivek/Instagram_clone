import { body, param, query } from 'express-validator';

export const createPostValidator = [
  body('caption').optional({ checkFalsy: true }).trim().isLength({ max: 2200 }),
  body('location').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('visibility').optional().isIn(['public', 'followers', 'private']),
  body('isReel').optional().isBoolean(),
  body('allowComments').optional().isBoolean(),
];

export const paginationValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

export const postIdParamValidator = [param('id').isMongoId()];
