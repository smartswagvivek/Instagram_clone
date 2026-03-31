import express from 'express';
import { param, query } from 'express-validator';

import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, [query('page').optional().isInt({ min: 1 })], validate, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/mark-all-read', protect, markAllNotificationsRead);
router.put('/:id/mark-read', protect, [param('id').isMongoId()], validate, markNotificationRead);
router.delete('/:id', protect, [param('id').isMongoId()], validate, deleteNotification);

export default router;
