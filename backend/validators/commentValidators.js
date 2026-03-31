import { body, param } from 'express-validator';

export const createCommentValidator = [
  param('postId').isMongoId(),
  body('text').trim().isLength({ min: 1, max: 500 }),
  body('parentCommentId').optional({ checkFalsy: true }).isMongoId(),
];

export const commentIdParamValidator = [param('id').isMongoId()];
