import Story from '../models/Story.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadMediaFiles, removeMediaFiles } from '../services/mediaService.js';
import { moderateText } from '../services/moderationService.js';
import { createNotification } from '../services/notificationService.js';

export const createStory = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('Story media is required');
    error.statusCode = 400;
    throw error;
  }

  const [media] = await uploadMediaFiles([req.file], 'stories');
  const story = await Story.create({
    author: req.user._id,
    media,
    caption: req.body.caption || '',
    visibility: req.body.visibility || 'followers',
    moderation: moderateText(req.body.caption || ''),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await story.populate('author', 'username fullName profilePicture');
  res.status(201).json({ message: 'Story created successfully', story });
});

export const getStoryFeed = asyncHandler(async (req, res) => {
  const stories = await Story.find({
    author: { $in: [...req.user.following, req.user._id] },
    expiresAt: { $gt: new Date() },
  })
    .populate('author', 'username fullName profilePicture')
    .populate('viewers.user', 'username fullName profilePicture')
    .sort({ createdAt: -1 });

  res.json(stories);
});

export const viewStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);

  if (!story) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }

  if (!story.viewers.some((entry) => String(entry.user) === String(req.user._id))) {
    story.viewers.push({ user: req.user._id, viewedAt: new Date() });
    await story.save();
  }

  res.json({ message: 'Story viewed' });
});

export const toggleStoryLike = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id).populate(
    'author',
    'username fullName profilePicture'
  );

  if (!story) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }

  const alreadyLiked = story.likes.some((entry) => String(entry) === String(req.user._id));

  story.likes = alreadyLiked
    ? story.likes.filter((entry) => String(entry) !== String(req.user._id))
    : [...story.likes, req.user._id];
  await story.save();

  if (!alreadyLiked && String(story.author._id) !== String(req.user._id)) {
    await createNotification(
      {
        recipient: story.author._id,
        actor: req.user._id,
        type: 'story',
        title: `${req.user.username} liked your story`,
        body: req.user.fullName || req.user.username,
        link: `/feed`,
      },
      req.app.get('io')
    );
  }

  res.json({ message: alreadyLiked ? 'Story unliked' : 'Story liked', likes: story.likes });
});

export const deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);

  if (!story) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(story.author) !== String(req.user._id) && req.user.role !== 'admin') {
    const error = new Error('Not authorized to delete this story');
    error.statusCode = 403;
    throw error;
  }

  await removeMediaFiles([story.media]);
  await story.deleteOne();
  res.json({ message: 'Story deleted successfully' });
});
