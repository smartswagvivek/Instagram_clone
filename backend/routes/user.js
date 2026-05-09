import express from 'express';

import {
  acceptFollowRequest,
  changePassword,
  createSavedCollection,
  createStoryHighlight,
  deactivateAccount,
  deleteSavedCollection,
  deleteStoryHighlight,
  followUser,
  getAccountSettings,
  getFollowRequests,
  getProfile,
  getProfileByUsername,
  getSavedPosts,
  getSuggestions,
  rejectFollowRequest,
  removeFollower,
  removeProfilePhoto,
  searchUsers,
  unfollowUser,
  updateCloseFriends,
  updateProfile,
  updatePrivacySettings,
  uploadAvatar,
  updateSavedCollection,
  updateStoryHighlight,
  updateUserListPreference,
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
router.get('/settings', protect, getAccountSettings);
router.get('/follow-requests', protect, getFollowRequests);
router.get('/username/:username', optional, getProfileByUsername);
router.put('/remove-profile-pic', protect, removeProfilePhoto);
router.post('/saved/collections', protect, createSavedCollection);
router.put('/saved/collections/:name', protect, updateSavedCollection);
router.delete('/saved/collections/:name', protect, deleteSavedCollection);
router.post('/highlights', protect, createStoryHighlight);
router.put('/highlights/:highlightId', protect, updateStoryHighlight);
router.delete('/highlights/:highlightId', protect, deleteStoryHighlight);
router.put('/close-friends', protect, updateCloseFriends);
router.put('/privacy', protect, updatePrivacySettings);
router.put('/password', protect, changePassword);
router.put('/preferences/:type', protect, updateUserListPreference);
router.post('/deactivate', protect, deactivateAccount);
router.post('/follow-requests/:id/accept', protect, userIdParamValidator, validate, acceptFollowRequest);
router.post('/follow-requests/:id/reject', protect, userIdParamValidator, validate, rejectFollowRequest);
router.post('/follow/:id', protect, userIdParamValidator, validate, followUser);
router.post('/unfollow/:id', protect, userIdParamValidator, validate, unfollowUser);
router.delete('/followers/:id', protect, userIdParamValidator, validate, removeFollower);
router.put('/profile', protect, updateProfileValidator, validate, updateProfile);
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadAvatar);
router.post('/:id/follow', protect, userIdParamValidator, validate, followUser);
router.post('/:id/unfollow', protect, userIdParamValidator, validate, unfollowUser);
router.put('/:id', protect, userIdParamValidator, updateProfileValidator, validate, updateProfile);
router.get('/:id', optional, userIdParamValidator, validate, getProfile);

export default router;
