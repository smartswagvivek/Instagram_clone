import User from '../models/User.js';
import Post from '../models/Post.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadMediaFiles } from '../services/mediaService.js';
import { sendActivityEmail } from '../services/mailService.js';
import { createNotification } from '../services/notificationService.js';

const DEFAULT_AVATAR_URL =
  'https://ui-avatars.com/api/?name=Instagram+User&background=f2f2f2&color=262626&bold=true&size=256';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  ]);

  return user;
};

export const getProfile = asyncHandler(async (req, res) => {
  const user = await populateRelationshipFields(User.findById(req.params.id));

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const relationship = getRelationshipState(req.user, user);
  const posts = relationship.canViewPosts
    ? await Post.find({ author: user._id, isArchived: false }).sort({ createdAt: -1 }).limit(24)
    : [];

  res.json({
    user,
    posts,
    ...relationship,
  });
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

  const relationship = getRelationshipState(req.user, user);
  const posts = relationship.canViewPosts
    ? await Post.find({ author: user._id, isArchived: false }).sort({ createdAt: -1 })
    : [];

  res.json({
    user,
    posts,
    ...relationship,
  });
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

  if (!(currentUser.followRequestsReceived || []).some((item) => String(item) === req.params.id)) {
    const error = new Error('Follow request not found');
    error.statusCode = 404;
    throw error;
  }

  currentUser.followRequestsReceived = currentUser.followRequestsReceived.filter(
    (item) => String(item) !== req.params.id
  );
  requestingUser.followRequestsSent = requestingUser.followRequestsSent.filter(
    (item) => String(item) !== String(currentUser._id)
  );
  currentUser.followers.push(requestingUser._id);
  requestingUser.following.push(currentUser._id);

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
    (item) => String(item) !== req.params.id
  );
  requestingUser.followRequestsSent = requestingUser.followRequestsSent.filter(
    (item) => String(item) !== String(currentUser._id)
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
      $nin: [...req.user.following, ...(req.user.followRequestsSent || [])],
    },
  })
    .sort({ followers: -1, createdAt: -1 })
    .select('username fullName profilePicture bio isVerified isPrivate')
    .limit(8);

  res.json(users);
});

export const getSavedPosts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
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

  res.json({
    savedPosts: user.savedPosts,
    collections: user.savedCollections,
  });
});
