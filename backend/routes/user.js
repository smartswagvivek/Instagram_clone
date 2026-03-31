import express from 'express';

import {
  acceptFollowRequest,
  followUser,
  getFollowRequests,
  getProfile,
  getProfileByUsername,
  getSavedPosts,
  getSuggestions,
  rejectFollowRequest,
  removeProfilePhoto,
  searchUsers,
  unfollowUser,
  updateProfile,
  uploadAvatar,
} from '../controllers/userController.js';
import { optional, protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  searchUsersValidator,
  updateProfileValidator,
  userIdParamValidator,
} from '../validators/userValidators.js';

const router = express.Router();

router.get('/search', searchUsersValidator, validate, searchUsers);
router.get('/suggestions', protect, getSuggestions);
router.get('/saved', protect, getSavedPosts);
router.get('/follow-requests', protect, getFollowRequests);
router.get('/username/:username', optional, getProfileByUsername);
router.put('/remove-profile-pic', protect, removeProfilePhoto);
router.post('/follow-requests/:id/accept', protect, userIdParamValidator, validate, acceptFollowRequest);
router.post('/follow-requests/:id/reject', protect, userIdParamValidator, validate, rejectFollowRequest);
router.post('/follow/:id', protect, userIdParamValidator, validate, followUser);
router.post('/unfollow/:id', protect, userIdParamValidator, validate, unfollowUser);
router.put('/profile', protect, updateProfileValidator, validate, updateProfile);
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadAvatar);
router.post('/:id/follow', protect, userIdParamValidator, validate, followUser);
router.post('/:id/unfollow', protect, userIdParamValidator, validate, unfollowUser);
router.put('/:id', protect, userIdParamValidator, updateProfileValidator, validate, updateProfile);
router.get('/:id', optional, userIdParamValidator, validate, getProfile);

export default router;
