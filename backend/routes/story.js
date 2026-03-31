import express from 'express';
import { param } from 'express-validator';

import {
  createStory,
  deleteStory,
  getStoryFeed,
  toggleStoryLike,
  viewStory,
} from '../controllers/storyController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, getStoryFeed);
router.get('/feed', protect, getStoryFeed);
router.post('/create', protect, upload.single('media'), createStory);
router.post('/', protect, upload.single('media'), createStory);
router.post('/:id/view', protect, [param('id').isMongoId()], validate, viewStory);
router.post('/:id/like', protect, [param('id').isMongoId()], validate, toggleStoryLike);
router.delete('/:id', protect, [param('id').isMongoId()], validate, deleteStory);

export default router;
