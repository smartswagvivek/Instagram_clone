import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

export const getAdminStats = asyncHandler(async (_req, res) => {
  const [totalUsers, totalPosts, totalComments, activeUsers, flaggedPosts, flaggedComments] =
    await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments({ isActive: true }),
      Post.countDocuments({ 'moderation.status': 'flagged' }),
      Comment.countDocuments({ 'moderation.status': 'flagged' }),
    ]);

  res.json({
    stats: {
      totalUsers,
      totalPosts,
      totalComments,
      activeUsers,
      flaggedPosts,
      flaggedComments,
    },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query.page, 20);
  const search = req.query.search?.trim();
  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({ users, total, hasMore: page * limit < total });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive },
    { new: true }
  );

  res.json({ message: 'User status updated', user });
});

export const listPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query.page, 20);
  const flaggedOnly = req.query.flaggedOnly === 'true';
  const query = flaggedOnly ? { 'moderation.status': 'flagged' } : {};

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate('author', 'username fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Post.countDocuments(query),
  ]);

  res.json({ posts, total, hasMore: page * limit < total });
});

export const listFlaggedComments = asyncHandler(async (_req, res) => {
  const comments = await Comment.find({ 'moderation.status': 'flagged' })
    .populate('author', 'username fullName')
    .populate('post', 'caption')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(comments);
});

export const deletePostAsAdmin = asyncHandler(async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  await Comment.deleteMany({ post: req.params.id });
  res.json({ message: 'Post deleted successfully' });
});
