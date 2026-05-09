import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Post from '../models/Post.js';
import Story from '../models/Story.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadMediaFiles } from '../services/mediaService.js';
import { sendActivityEmail } from '../services/mailService.js';
import { createNotification } from '../services/notificationService.js';

const DEFAULT_AVATAR_URL =
  'https://ui-avatars.com/api/?name=Instagram+User&background=f2f2f2&color=262626&bold=true&size=256';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const postAuthorPopulate = {
  path: 'author',
  select: 'username fullName profilePicture isVerified',
};

const getRelationshipState = (viewer, profileUser) => {
  const isSelf = viewer && String(viewer._id) === String(profileUser._id);
  const isFollowing = Boolean(
    viewer?.following?.some((item) => String(item?._id || item) === String(profileUser._id))
  );
  const hasPendingRequest = Boolean(
    viewer?.followRequestsSent?.some((item) => String(item?._id || item) === String(profileUser._id))
  );

  return {
    isSelf,
    isFollowing,
    hasPendingRequest,
    canViewPosts: !profileUser.isPrivate || isSelf || isFollowing,
  };
};

const populateRelationshipFields = async (queryOrDocument) => {
  const user = await queryOrDocument;
  if (!user) return null;

  await user.populate([
    { path: 'followers', select: 'username fullName profilePicture' },
    { path: 'following', select: 'username fullName profilePicture' },
    { path: 'followRequestsReceived', select: 'username fullName profilePicture isPrivate' },
    { path: 'followRequestsSent', select: 'username fullName profilePicture isPrivate' },
    { path: 'closeFriends', select: 'username fullName profilePicture' },
    { path: 'blockedUsers', select: 'username fullName profilePicture' },
    { path: 'restrictedUsers', select: 'username fullName profilePicture' },
  ]);

  return user;
};

const ensureAllPostsCollection = (user) => {
  if (!user.savedCollections.some((collection) => collection.name.toLowerCase() === 'all posts')) {
    user.savedCollections.unshift({ name: 'All Posts', posts: [...user.savedPosts] });
  }
};

const buildProfilePayload = async (profileUser, viewer) => {
  const relationship = getRelationshipState(viewer, profileUser);
  const profileQuery = relationship.canViewPosts
    ? { author: profileUser._id }
    : { _id: null };

  const [posts, reels, taggedPosts, archivedPosts, activeStories] = await Promise.all([
    Post.find({ ...profileQuery, isArchived: false, isReel: { $ne: true } })
      .populate(postAuthorPopulate)
      .sort({ createdAt: -1 })
      .limit(24),
    Post.find({ ...profileQuery, isArchived: false, isReel: true })
      .populate(postAuthorPopulate)
      .sort({ createdAt: -1 })
      .limit(24),
    Post.find({
      ...(relationship.canViewPosts ? {} : { _id: null }),
      mentions: profileUser._id,
      isArchived: false,
    })
      .populate(postAuthorPopulate)
      .sort({ createdAt: -1 })
      .limit(24),
    relationship.isSelf
      ? Post.find({ author: profileUser._id, isArchived: true })
          .populate(postAuthorPopulate)
          .sort({ createdAt: -1 })
          .limit(24)
      : Promise.resolve([]),
    Story.find({
      author: profileUser._id,
      expiresAt: { $gt: new Date() },
    })
      .populate('author', 'username fullName profilePicture')
      .sort({ createdAt: -1 }),
  ]);

  return {
    user: profileUser,
    posts,
    reels,
    taggedPosts,
    archivedPosts,
    activeStories,
    highlights: profileUser.storyHighlights || [],
    ...relationship,
  };
};

const normalizeBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
};

const populateSavedCollections = async (userId) =>
  User.findById(userId)
    .populate({
      path: 'savedPosts',
      populate: {
        path: 'author',
        select: 'username fullName profilePicture',
      },
    })
    .populate({
      path: 'savedCollections.posts',
      populate: {
        path: 'author',
        select: 'username fullName profilePicture',
      },
    });

export const getProfile = asyncHandler(async (req, res) => {
  const user = await populateRelationshipFields(User.findById(req.params.id));

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.json(await buildProfilePayload(user, req.user));
});

export const getProfileByUsername = asyncHandler(async (req, res) => {
  const user = await populateRelationshipFields(
    User.findOne({ username: req.params.username.toLowerCase() })
  );

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.json(await buildProfilePayload(user, req.user));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id || req.user._id;

  if (String(targetUserId) !== String(req.user._id) && req.user.role !== 'admin') {
    const error = new Error('Not authorized to update this profile');
    error.statusCode = 403;
    throw error;
  }

  const updates = ['username', 'fullName', 'bio', 'website', 'phone', 'isPrivate'];
  const payload = updates.reduce((acc, key) => {
    if (req.body[key] !== undefined) {
      acc[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
    }
    return acc;
  }, {});

  if (payload.username) {
    payload.username = payload.username.toLowerCase();

    const existingUser = await User.findOne({
      username: payload.username,
      _id: { $ne: targetUserId },
    }).select('_id');

    if (existingUser) {
      const error = new Error('Username already taken');
      error.statusCode = 400;
      throw error;
    }
  }

  const user = await User.findById(targetUserId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  Object.assign(user, payload);

  if (req.body.accountSettings) {
    user.accountSettings = {
      ...user.accountSettings?.toObject?.(),
      ...req.body.accountSettings,
      notificationPreferences: {
        ...user.accountSettings?.notificationPreferences?.toObject?.(),
        ...(req.body.accountSettings.notificationPreferences || {}),
      },
    };
  }

  await user.save();

  res.json({ message: 'Profile updated successfully', user });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('Profile picture is required');
    error.statusCode = 400;
    throw error;
  }

  const [media] = await uploadMediaFiles([req.file], 'avatars');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      profilePicture: {
        url: media.url,
        publicId: media.publicId,
      },
    },
    { new: true }
  );

  res.json({ message: 'Profile picture updated successfully', user });
});

export const removeProfilePhoto = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      profilePicture: {
        url: DEFAULT_AVATAR_URL,
        publicId: null,
      },
    },
    { new: true }
  );

  res.json({ message: 'Profile photo removed successfully', user });
});

export const followUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    const error = new Error('You cannot follow yourself');
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if ((currentUser.blockedUsers || []).some((item) => String(item) === String(targetUser._id))) {
    const error = new Error('Unblock this user before following');
    error.statusCode = 400;
    throw error;
  }

  if ((targetUser.blockedUsers || []).some((item) => String(item) === String(currentUser._id))) {
    const error = new Error('This account is unavailable');
    error.statusCode = 403;
    throw error;
  }

  if ((currentUser.following || []).some((item) => String(item) === req.params.id)) {
    const error = new Error('Already following this user');
    error.statusCode = 400;
    throw error;
  }

  if ((currentUser.followRequestsSent || []).some((item) => String(item) === req.params.id)) {
    const error = new Error('Follow request already sent');
    error.statusCode = 400;
    throw error;
  }

  if (targetUser.isPrivate) {
    currentUser.followRequestsSent.push(targetUser._id);
    targetUser.followRequestsReceived.push(currentUser._id);

    await Promise.all([currentUser.save(), targetUser.save()]);

    await createNotification(
      {
        recipient: targetUser._id,
        actor: currentUser._id,
        type: 'follow_request',
        title: `${currentUser.username} requested to follow you`,
        body: `${currentUser.fullName || currentUser.username} wants to see your posts.`,
        link: `/profile/${currentUser._id}`,
      },
      req.app.get('io')
    );

    await populateRelationshipFields(targetUser);

    res.json({
      message: 'Follow request sent successfully',
      user: targetUser,
      status: 'requested',
    });
    return;
  }

  currentUser.following.push(targetUser._id);
  targetUser.followers.push(currentUser._id);

  await Promise.all([currentUser.save(), targetUser.save()]);

  await createNotification(
    {
      recipient: targetUser._id,
      actor: currentUser._id,
      type: 'follow',
      title: `${currentUser.username} started following you`,
      body: `${currentUser.fullName || currentUser.username} is now following you.`,
      link: `/profile/${currentUser._id}`,
    },
    req.app.get('io')
  );

  await sendActivityEmail({
    recipientEmail: targetUser.email,
    actorUsername: currentUser.username,
    actionText: 'started following you',
  }).catch((error) => {
    console.error('Failed to send follow email', error.message);
  });

  await targetUser.populate('followers', 'username fullName profilePicture');
  await targetUser.populate('following', 'username fullName profilePicture');

  res.json({
    message: 'User followed successfully',
    user: targetUser,
    status: 'following',
    followersCount: targetUser.followers.length,
  });
});

export const unfollowUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if ((currentUser.followRequestsSent || []).some((item) => String(item) === req.params.id)) {
    currentUser.followRequestsSent = currentUser.followRequestsSent.filter(
      (item) => String(item) !== req.params.id
    );
    targetUser.followRequestsReceived = targetUser.followRequestsReceived.filter(
      (item) => String(item) !== String(currentUser._id)
    );

    await Promise.all([currentUser.save(), targetUser.save()]);
    await populateRelationshipFields(targetUser);

    res.json({
      message: 'Follow request removed successfully',
      user: targetUser,
      status: 'none',
    });
    return;
  }

  currentUser.following = currentUser.following.filter((item) => String(item) !== req.params.id);
  targetUser.followers = targetUser.followers.filter(
    (item) => String(item) !== String(currentUser._id)
  );
  currentUser.closeFriends = currentUser.closeFriends.filter((item) => String(item) !== req.params.id);
  currentUser.pinnedConversations = currentUser.pinnedConversations.filter(
    (item) => String(item) !== req.params.id
  );

  await Promise.all([currentUser.save(), targetUser.save()]);
  await targetUser.populate('followers', 'username fullName profilePicture');
  await targetUser.populate('following', 'username fullName profilePicture');

  res.json({
    message: 'User unfollowed successfully',
    user: targetUser,
    status: 'none',
    followersCount: targetUser.followers.length,
  });
});

export const removeFollower = asyncHandler(async (req, res) => {
  const follower = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!follower) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  currentUser.followers = currentUser.followers.filter(
    (item) => String(item) !== String(follower._id)
  );
  follower.following = follower.following.filter(
    (item) => String(item) !== String(currentUser._id)
  );

  await Promise.all([currentUser.save(), follower.save()]);

  const updatedUser = await populateRelationshipFields(User.findById(req.user._id));
  res.json({
    message: 'Follower removed successfully',
    user: updatedUser,
    removedUserId: follower._id,
  });
});

export const getFollowRequests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'followRequestsReceived',
    'username fullName profilePicture isPrivate'
  );

  res.json(user.followRequestsReceived || []);
});

export const acceptFollowRequest = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id);
  const requestingUser = await User.findById(req.params.id);

  if (!requestingUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const hasReceivedRequest = (currentUser.followRequestsReceived || []).some(
    (item) => String(item?._id || item) === String(requestingUser._id)
  );
  const hasSentRequest = (requestingUser.followRequestsSent || []).some(
    (item) => String(item?._id || item) === String(currentUser._id)
  );
  const alreadyFollower = (currentUser.followers || []).some(
    (item) => String(item?._id || item) === String(requestingUser._id)
  );

  if (!hasReceivedRequest && !hasSentRequest && !alreadyFollower) {
    const error = new Error('Follow request not found');
    error.statusCode = 404;
    throw error;
  }

  currentUser.followRequestsReceived = currentUser.followRequestsReceived.filter(
    (item) => String(item?._id || item) !== String(requestingUser._id)
  );
  requestingUser.followRequestsSent = requestingUser.followRequestsSent.filter(
    (item) => String(item?._id || item) !== String(currentUser._id)
  );

  if (!alreadyFollower) {
    currentUser.followers.push(requestingUser._id);
  }

  if (
    !(requestingUser.following || []).some(
      (item) => String(item?._id || item) === String(currentUser._id)
    )
  ) {
    requestingUser.following.push(currentUser._id);
  }

  await Promise.all([currentUser.save(), requestingUser.save()]);

  await createNotification(
    {
      recipient: requestingUser._id,
      actor: currentUser._id,
      type: 'follow',
      title: `${currentUser.username} accepted your follow request`,
      body: `${currentUser.fullName || currentUser.username} approved your request.`,
      link: `/profile/${currentUser._id}`,
    },
    req.app.get('io')
  );

  const updatedUser = await populateRelationshipFields(User.findById(req.user._id));
  res.json({ message: 'Follow request accepted', user: updatedUser });
});

export const rejectFollowRequest = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id);
  const requestingUser = await User.findById(req.params.id);

  if (!requestingUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  currentUser.followRequestsReceived = currentUser.followRequestsReceived.filter(
    (item) => String(item?._id || item) !== String(requestingUser._id)
  );
  requestingUser.followRequestsSent = requestingUser.followRequestsSent.filter(
    (item) => String(item?._id || item) !== String(currentUser._id)
  );

  await Promise.all([currentUser.save(), requestingUser.save()]);

  const updatedUser = await populateRelationshipFields(User.findById(req.user._id));
  res.json({ message: 'Follow request rejected', user: updatedUser });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const safeQuery = escapeRegex(q);
  const users = await User.find({
    $or: [
      { username: { $regex: safeQuery, $options: 'i' } },
      { fullName: { $regex: safeQuery, $options: 'i' } },
    ],
  })
    .select('username fullName profilePicture bio isVerified isPrivate followers following')
    .sort({ username: 1 });

  res.json(users);
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const users = await User.find({
    _id: {
      $ne: req.user._id,
      $nin: [...req.user.following, ...(req.user.followRequestsSent || []), ...(req.user.blockedUsers || [])],
    },
  })
    .sort({ followers: -1, createdAt: -1 })
    .select('username fullName profilePicture bio isVerified isPrivate')
    .limit(8);

  res.json(users);
});

export const getSavedPosts = asyncHandler(async (req, res) => {
  const user = await populateSavedCollections(req.user._id);
  ensureAllPostsCollection(user);
  await user.save();

  res.json({
    savedPosts: user.savedPosts,
    collections: user.savedCollections,
  });
});

export const createSavedCollection = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) {
    const error = new Error('Collection name is required');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(req.user._id);
  const exists = user.savedCollections.some((collection) => collection.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    const error = new Error('Collection already exists');
    error.statusCode = 400;
    throw error;
  }

  user.savedCollections.push({ name, posts: [] });
  await user.save();

  const updatedUser = await populateSavedCollections(req.user._id);
  res.status(201).json({ collections: updatedUser.savedCollections });
});

export const updateSavedCollection = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const user = await User.findById(req.user._id);
  const collection = user.savedCollections.find(
    (item) => item.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!collection) {
    const error = new Error('Collection not found');
    error.statusCode = 404;
    throw error;
  }

  if (name) {
    collection.name = name;
  }

  if (req.body.postIds) {
    collection.posts = req.body.postIds;
  }

  await user.save();
  const updatedUser = await populateSavedCollections(req.user._id);
  res.json({ collections: updatedUser.savedCollections });
});

export const deleteSavedCollection = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.savedCollections = user.savedCollections.filter(
    (item) => item.name.toLowerCase() !== req.params.name.toLowerCase() || item.name.toLowerCase() === 'all posts'
  );
  await user.save();
  const updatedUser = await populateSavedCollections(req.user._id);
  res.json({ collections: updatedUser.savedCollections });
});

export const createStoryHighlight = asyncHandler(async (req, res) => {
  const title = req.body.title?.trim();
  const storyIds = Array.isArray(req.body.storyIds) ? req.body.storyIds : [];

  if (!title || storyIds.length === 0) {
    const error = new Error('Highlight title and stories are required');
    error.statusCode = 400;
    throw error;
  }

  const stories = await Story.find({
    _id: { $in: storyIds },
    author: req.user._id,
  }).sort({ createdAt: 1 });

  if (stories.length === 0) {
    const error = new Error('Stories not found');
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(req.user._id);
  const highlight = {
    id: `highlight_${Date.now()}`,
    title,
    coverImage: stories[0].media?.url,
    items: stories.map((story) => ({
      storyId: story._id,
      media: story.media,
      caption: story.caption,
      createdAt: story.createdAt,
    })),
  };

  user.storyHighlights.push(highlight);
  await user.save();

  res.status(201).json({ highlight });
});

export const deleteStoryHighlight = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.storyHighlights = user.storyHighlights.filter((item) => item.id !== req.params.highlightId);
  await user.save();
  res.json({ highlights: user.storyHighlights });
});

export const updateStoryHighlight = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const highlight = user.storyHighlights.find((item) => item.id === req.params.highlightId);

  if (!highlight) {
    const error = new Error('Highlight not found');
    error.statusCode = 404;
    throw error;
  }

  if (req.body.title) {
    highlight.title = req.body.title.trim();
  }

  if (req.body.coverImage) {
    highlight.coverImage = req.body.coverImage;
  }

  await user.save();
  res.json({ highlight });
});

export const updateCloseFriends = asyncHandler(async (req, res) => {
  const friendIds = Array.isArray(req.body.friendIds) ? req.body.friendIds : [];
  const user = await User.findById(req.user._id);
  user.closeFriends = friendIds;
  await user.save();
  await user.populate('closeFriends', 'username fullName profilePicture');
  res.json({ closeFriends: user.closeFriends });
});

export const getAccountSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    'accountSettings blockedUsers restrictedUsers closeFriends pinnedConversations'
  );
  await user.populate([
    { path: 'blockedUsers', select: 'username fullName profilePicture' },
    { path: 'restrictedUsers', select: 'username fullName profilePicture' },
    { path: 'closeFriends', select: 'username fullName profilePicture' },
    { path: 'pinnedConversations', select: 'username fullName profilePicture' },
  ]);
  res.json(user);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    const error = new Error('Current and new password are required');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(req.user._id).select('+password');
  const matches = await user.matchPassword(currentPassword);
  if (!matches) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password updated successfully' });
});

export const updateUserListPreference = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { userId, action = 'add' } = req.body;
  const user = await User.findById(req.user._id);

  const listMap = {
    blocked: 'blockedUsers',
    restricted: 'restrictedUsers',
    pinned: 'pinnedConversations',
  };

  const listName = listMap[type];
  if (!listName) {
    const error = new Error('Invalid preference type');
    error.statusCode = 400;
    throw error;
  }

  const currentList = user[listName] || [];
  if (action === 'remove') {
    user[listName] = currentList.filter((entry) => String(entry) !== String(userId));
  } else if (!currentList.some((entry) => String(entry) === String(userId))) {
    user[listName].push(userId);
  }

  await user.save();
  await user.populate(listName, 'username fullName profilePicture');
  res.json({ [listName]: user[listName] });
});

export const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.isActive = false;
  await user.save();
  res.json({ message: 'Account deactivated successfully' });
});

export const updatePrivacySettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.isPrivate = normalizeBoolean(req.body.isPrivate, user.isPrivate);
  user.accountSettings = {
    ...user.accountSettings?.toObject?.(),
    allowMessageRequestsFromEveryone: normalizeBoolean(
      req.body.allowMessageRequestsFromEveryone,
      user.accountSettings?.allowMessageRequestsFromEveryone
    ),
    showActivityStatus: normalizeBoolean(
      req.body.showActivityStatus,
      user.accountSettings?.showActivityStatus
    ),
    notificationPreferences: {
      ...user.accountSettings?.notificationPreferences?.toObject?.(),
      ...(req.body.notificationPreferences || {}),
    },
  };
  await user.save();
  res.json({ user });
});
