import express from 'express';
import { body, param, query } from 'express-validator';

import {
  deleteMessage,
  getConversation,
  getConversations,
  markMessageSeen,
  sendMessage,
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.get(
  '/conversation/:userId',
  protect,
  [param('userId').isMongoId(), query('page').optional().isInt({ min: 1 })],
  validate,
  getConversation
);
router.get(
  '/:conversationId',
  protect,
  [
    param('conversationId').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
  ],
  validate,
  (req, _res, next) => {
    req.params.userId = req.params.conversationId;
    next();
  },
  getConversation
);
router.post(
  '/',
  protect,
  upload.array('media', 4),
  [body('recipientId').isMongoId(), body('text').optional({ checkFalsy: true }).trim()],
  validate,
  sendMessage
);
router.post(
  '/send',
  protect,
  upload.array('media', 4),
  [body('recipientId').isMongoId(), body('text').optional({ checkFalsy: true }).trim()],
  validate,
  sendMessage
);
router.put('/:id/mark-seen', protect, [param('id').isMongoId()], validate, markMessageSeen);
router.delete('/:id', protect, [param('id').isMongoId()], validate, deleteMessage);

export default router;
