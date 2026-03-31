import express from 'express';
import { body, param, query } from 'express-validator';

import {
  deletePostAsAdmin,
  getAdminStats,
  listFlaggedComments,
  listPosts,
  listUsers,
  toggleUserStatus,
} from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/stats', getAdminStats);
router.get('/users', [query('page').optional().isInt({ min: 1 })], validate, listUsers);
router.put(
  '/users/:id/status',
  [param('id').isMongoId(), body('isActive').isBoolean()],
  validate,
  toggleUserStatus
);
router.get('/posts', [query('page').optional().isInt({ min: 1 })], validate, listPosts);
router.get('/comments/flagged', listFlaggedComments);
router.delete('/posts/:id', [param('id').isMongoId()], validate, deletePostAsAdmin);

export default router;
