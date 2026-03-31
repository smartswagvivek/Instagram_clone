import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertCleanText, moderateText } from '../services/moderationService.js';
import { sendActivityEmail } from '../services/mailService.js';
import { createNotification } from '../services/notificationService.js';

export const createComment = asyncHandler(async (req, res) => {
  const { text, parentCommentId } = req.body;
  const post = await Post.findById(req.params.postId).populate(
    'author',
    'username fullName profilePicture email'
  );

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (!post.allowComments) {
    const error = new Error('Comments are disabled for this post');
    error.statusCode = 400;
    throw error;
  }

  assertCleanText(text, 'comment');
  const moderation = moderateText(text);

  if (parentCommentId) {
    const parentComment = await Comment.findOne({
      _id: parentCommentId,
      post: post._id,
    }).select('_id');

    if (!parentComment) {
      const error = new Error('Parent comment not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    text,
    parentComment: parentCommentId || null,
    moderation,
  });

  post.stats.commentsCount += 1;
  await post.save();
  await comment.populate('author', 'username fullName profilePicture');

  if (String(post.author._id) !== String(req.user._id)) {
    await createNotification(
      {
        recipient: post.author._id,
        actor: req.user._id,
        type: 'comment',
        post: post._id,
        comment: comment._id,
        title: `${req.user.username} commented on your post`,
        body: text,
        link: `/post/${post._id}`,
      },
      req.app.get('io')
    );

    await sendActivityEmail({
      recipientEmail: post.author.email,
      actorUsername: req.user.username,
      actionText: 'commented on your post',
    }).catch((error) => {
      console.error('Failed to send comment email', error.message);
    });
  }

  res.status(201).json({ message: 'Comment added successfully', comment });
});

export const getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate('author', 'username fullName profilePicture')
    .sort({ createdAt: 1 });

  const map = new Map(
    comments.map((comment) => [String(comment._id), { ...comment.toJSON(), replies: [] }])
  );
  const roots = [];

  map.forEach((comment) => {
    if (comment.parentComment) {
      const parent = map.get(String(comment.parentComment));
      if (parent) {
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    } else {
      roots.push(comment);
    }
  });

  const sortReplies = (items) =>
    items
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((item) => ({
        ...item,
        replies: sortReplies(item.replies || []),
      }));

  res.json(sortReplies(roots).reverse());
});

export const likeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  if (!comment.likes.some((id) => String(id) === String(req.user._id))) {
    comment.likes.push(req.user._id);
    await comment.save();
  }

  res.json({ message: 'Comment liked', likesCount: comment.likes.length });
});

export const unlikeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  comment.likes = comment.likes.filter((id) => String(id) !== String(req.user._id));
  await comment.save();

  res.json({ message: 'Comment unliked', likesCount: comment.likes.length });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(comment.author) !== String(req.user._id) && req.user.role !== 'admin') {
    const error = new Error('Not authorized to delete this comment');
    error.statusCode = 403;
    throw error;
  }

  const postComments = await Comment.find({ post: comment.post }).select('_id parentComment');
  const commentIdsToDelete = new Set([String(comment._id)]);
  let added = true;

  while (added) {
    added = false;
    postComments.forEach((item) => {
      if (
        item.parentComment &&
        commentIdsToDelete.has(String(item.parentComment)) &&
        !commentIdsToDelete.has(String(item._id))
      ) {
        commentIdsToDelete.add(String(item._id));
        added = true;
      }
    });
  }

  await Comment.deleteMany({ _id: { $in: [...commentIdsToDelete] } });
  await Post.findByIdAndUpdate(comment.post, {
    $inc: { 'stats.commentsCount': -commentIdsToDelete.size },
  });

  res.json({ message: 'Comment deleted successfully', deletedCount: commentIdsToDelete.size });
});
