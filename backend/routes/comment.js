import express from 'express';
import { param } from 'express-validator';

import {
  createComment,
  deleteComment,
  getComments,
  likeComment,
  unlikeComment,
} from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { commentIdParamValidator, createCommentValidator } from '../validators/commentValidators.js';

const router = express.Router();

router.post('/:postId/create', protect, createCommentValidator, validate, createComment);
router.get('/:postId', [param('postId').isMongoId()], validate, getComments);
router.post('/:id/like', protect, commentIdParamValidator, validate, likeComment);
router.post('/:id/unlike', protect, commentIdParamValidator, validate, unlikeComment);
router.delete('/:id', protect, commentIdParamValidator, validate, deleteComment);

export default router;
