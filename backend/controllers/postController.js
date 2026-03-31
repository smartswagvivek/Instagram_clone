import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { getExploreFeed, getFeed } from '../services/feedService.js';
import { moderateText } from '../services/moderationService.js';
import { sendActivityEmail } from '../services/mailService.js';
import { removeMediaFiles, uploadMediaFiles } from '../services/mediaService.js';
import { createNotification } from '../services/notificationService.js';

const extractHashtags = (caption = '') =>
  [...new Set((caption.match(/#([\w-]+)/g) || []).map((tag) => tag.replace('#', '').toLowerCase()))];

const extractMentions = (caption = '') =>
  [...new Set((caption.match(/@([\w.]+)/g) || []).map((tag) => tag.replace('@', '').toLowerCase()))];

export const createPost = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    const error = new Error('At least one media file is required');
    error.statusCode = 400;
    throw error;
  }

  const moderation = moderateText(req.body.caption || '');
  const media = await uploadMediaFiles(req.files, req.body.isReel ? 'reels' : 'posts');
  const mentionUsernames = extractMentions(req.body.caption);
  const mentionedUsers = mentionUsernames.length
    ? await User.find({ username: { $in: mentionUsernames } }).select('_id')
    : [];

  const post = await Post.create({
    author: req.user._id,
    caption: req.body.caption || '',
    location: req.body.location || '',
    visibility: req.body.visibility || 'public',
    allowComments: req.body.allowComments !== 'false',
    isReel: req.body.isReel === 'true' || req.body.isReel === true,
    media,
    hashtags: extractHashtags(req.body.caption),
    mentions: mentionedUsers.map((user) => user._id),
    moderation,
  });

  await post.populate('author', 'username fullName profilePicture isVerified');
  res.status(201).json({ message: 'Post created successfully', post });
});

export const fetchFeed = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query.page, req.query.limit || 10);
  const payload = await getFeed({
    user: req.user,
    page,
    limit,
    mode: req.query.mode || 'algorithmic',
  });

  res.json(payload);
});

export const fetchExplore = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query.page, req.query.limit || 15);
  const payload = await getExploreFeed({ page, limit, q: req.query.q || '' });
  res.json(payload);
});

export const fetchReels = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query.page, req.query.limit || 12);
  const reels = await Post.find({
    isReel: true,
    visibility: 'public',
    isArchived: false,
  })
    .populate('author', 'username fullName profilePicture isVerified')
    .sort({ 'stats.sharesCount': -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ posts: reels, hasMore: reels.length === limit });
});

export const searchPosts = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim() || '';
  const posts = await Post.find({
    visibility: 'public',
    isArchived: false,
    $or: [
      { caption: { $regex: q, $options: 'i' } },
      { hashtags: { $regex: q, $options: 'i' } },
    ],
  })
    .populate('author', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(posts);
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    'author',
    'username fullName profilePicture isVerified'
  );

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  post.stats.viewsCount += 1;
  await post.save();

  const comments = await Comment.find({ post: post._id, parentComment: null })
    .populate('author', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .limit(30);

  res.json({ post, comments });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(post.author) !== String(req.user._id)) {
    const error = new Error('Not authorized to edit this post');
    error.statusCode = 403;
    throw error;
  }

  const caption = req.body.caption ?? post.caption;
  const mentionUsernames = extractMentions(caption);
  const mentionedUsers = mentionUsernames.length
    ? await User.find({ username: { $in: mentionUsernames } }).select('_id')
    : [];

  post.caption = caption;
  post.location = req.body.location ?? post.location;
  post.visibility = req.body.visibility ?? post.visibility;
  post.allowComments =
    req.body.allowComments !== undefined ? req.body.allowComments === true || req.body.allowComments === 'true' : post.allowComments;
  post.hashtags = extractHashtags(caption);
  post.mentions = mentionedUsers.map((user) => user._id);
  post.moderation = moderateText(caption);
  post.isEdited = true;

  await post.save();
  await post.populate('author', 'username fullName profilePicture isVerified');

  res.json({ message: 'Post updated successfully', post });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({ author: req.params.userId, isArchived: false })
    .populate('author', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 });

  res.json(posts);
});

export const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    'author',
    'username fullName profilePicture email'
  );

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (!post.likes.some((id) => String(id) === String(req.user._id))) {
    post.likes.push(req.user._id);
    await post.save();

    if (String(post.author._id) !== String(req.user._id)) {
      await createNotification(
        {
          recipient: post.author._id,
          actor: req.user._id,
          type: 'like',
          post: post._id,
          title: `${req.user.username} liked your post`,
          body: req.user.fullName || req.user.username,
          link: `/post/${post._id}`,
        },
        req.app.get('io')
      );

      await sendActivityEmail({
        recipientEmail: post.author.email,
        actorUsername: req.user.username,
        actionText: 'liked your post',
      }).catch((error) => {
        console.error('Failed to send like email', error.message);
      });
    }
  }

  res.json({ message: 'Post liked', likesCount: post.likes.length });
});

export const unlikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  post.likes = post.likes.filter((id) => String(id) !== String(req.user._id));
  await post.save();

  res.json({ message: 'Post unliked', likesCount: post.likes.length });
});

export const savePost = asyncHandler(async (req, res) => {
  const { collectionName = 'All Posts' } = req.body;
  const post = await Post.findById(req.params.id);
  const user = await User.findById(req.user._id);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (!user.savedPosts.some((id) => String(id) === String(post._id))) {
    user.savedPosts.push(post._id);
  }

  let collection = user.savedCollections.find(
    (item) => item.name.toLowerCase() === collectionName.toLowerCase()
  );
  if (!collection) {
    user.savedCollections.push({ name: collectionName, posts: [post._id] });
  } else if (!collection.posts.some((id) => String(id) === String(post._id))) {
    collection.posts.push(post._id);
  }

  if (!post.saves.some((id) => String(id) === String(user._id))) {
    post.saves.push(user._id);
    post.stats.savesCount += 1;
  }

  await Promise.all([user.save(), post.save()]);
  res.json({ message: 'Post saved successfully', collectionName });
});

export const unsavePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  const user = await User.findById(req.user._id);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  user.savedPosts = user.savedPosts.filter((id) => String(id) !== String(post._id));
  user.savedCollections = user.savedCollections.map((collection) => ({
    ...collection.toObject(),
    posts: collection.posts.filter((id) => String(id) !== String(post._id)),
  }));

  post.saves = post.saves.filter((id) => String(id) !== String(user._id));
  post.stats.savesCount = Math.max(post.stats.savesCount - 1, 0);

  await Promise.all([user.save(), post.save()]);
  res.json({ message: 'Post removed from saved items' });
});

export const sharePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  post.stats.sharesCount += 1;
  await post.save();

  res.json({
    message: 'Share tracked successfully',
    shareUrl: `${req.protocol}://${req.get('host')}/post/${post._id}`,
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(post.author) !== String(req.user._id) && req.user.role !== 'admin') {
    const error = new Error('Not authorized to delete this post');
    error.statusCode = 403;
    throw error;
  }

  await removeMediaFiles(post.media);
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();

  res.json({ message: 'Post deleted successfully' });
});
