import Post from '../models/Post.js';

const scorePost = (post) => {
  const ageInHours = Math.max(
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60),
    1
  );

  const likes = post.likes?.length || 0;
  const comments = post.stats?.commentsCount || 0;
  const shares = post.stats?.sharesCount || 0;
  const saves = post.stats?.savesCount || 0;

  return likes * 3 + comments * 4 + shares * 5 + saves * 4 + 24 / ageInHours;
};

export const getFeed = async ({ user, page, limit, mode = 'algorithmic' }) => {
  const followedUserIds = (user.following || []).map((item) => String(item));
  const baseQuery = {
    isArchived: false,
    $or: [
      { author: user._id },
      { author: { $in: user.following } },
      { visibility: 'public' },
    ],
  };

  const posts = await Post.find(baseQuery)
    .populate('author', 'username fullName profilePicture isVerified isPrivate')
    .sort({ createdAt: -1 })
    .limit(limit * 4);

  const visiblePosts = posts.filter((post) => {
    const authorId = String(post.author?._id || '');
    return (
      !post.author?.isPrivate || authorId === String(user._id) || followedUserIds.includes(authorId)
    );
  });

  const sorted =
    mode === 'chronological'
      ? visiblePosts
      : [...visiblePosts].sort((a, b) => scorePost(b) - scorePost(a));

  const start = (page - 1) * limit;
  const paginated = sorted.slice(start, start + limit);

  return {
    posts: paginated,
    total: sorted.length,
    hasMore: start + limit < sorted.length,
    mode,
  };
};

export const getExploreFeed = async ({ page, limit, q }) => {
  const query = {
    visibility: 'public',
    isArchived: false,
    ...(q
      ? {
          $or: [
            { caption: { $regex: q, $options: 'i' } },
            { hashtags: { $regex: q, $options: 'i' } },
          ],
        }
      : {}),
  };

  const posts = await Post.find(query)
    .populate('author', 'username fullName profilePicture isVerified isPrivate')
    .sort({ 'stats.sharesCount': -1, 'stats.commentsCount': -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const visiblePosts = posts.filter((post) => !post.author?.isPrivate);
  const total = await Post.countDocuments(query);

  return {
    posts: visiblePosts,
    total,
    hasMore: page * limit < total,
  };
};
