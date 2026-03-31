import express from 'express';
import { param, query } from 'express-validator';

import {
  createPost,
  deletePost,
  fetchExplore,
  fetchFeed,
  fetchReels,
  getPost,
  getUserPosts,
  likePost,
  savePost,
  searchPosts,
  sharePost,
  unlikePost,
  unsavePost,
  updatePost,
} from '../controllers/postController.js';
import { createComment } from '../controllers/commentController.js';
import { createCommentValidator } from '../validators/commentValidators.js';
import { optional, protect } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  createPostValidator,
  paginationValidator,
  postIdParamValidator,
} from '../validators/postValidators.js';

const router = express.Router();

router.post('/', protect, postLimiter, upload.array('media', 10), createPostValidator, validate, createPost);
router.post('/create', protect, postLimiter, upload.array('media', 10), createPostValidator, validate, createPost);
router.get('/feed', protect, paginationValidator, validate, fetchFeed);
router.get('/explore', optional, paginationValidator, validate, fetchExplore);
router.get('/reels', optional, paginationValidator, validate, fetchReels);
router.get('/search', optional, [query('q').trim().isLength({ min: 1 })], validate, searchPosts);
router.get('/user/:userId', optional, [param('userId').isMongoId()], validate, getUserPosts);
router.post(
  '/:id/comment',
  protect,
  (req, _res, next) => {
    req.params.postId = req.params.id;
    next();
  },
  createCommentValidator,
  validate,
  createComment
);
router.get('/:id', optional, postIdParamValidator, validate, getPost);
router.post('/:id/like', protect, postIdParamValidator, validate, likePost);
router.post('/:id/unlike', protect, postIdParamValidator, validate, unlikePost);
router.post('/:id/save', protect, postIdParamValidator, validate, savePost);
router.post('/:id/unsave', protect, postIdParamValidator, validate, unsavePost);
router.post('/:id/share', protect, postIdParamValidator, validate, sharePost);
router.put('/:id', protect, postIdParamValidator, createPostValidator, validate, updatePost);
router.delete('/:id', protect, postIdParamValidator, validate, deletePost);

export default router;
