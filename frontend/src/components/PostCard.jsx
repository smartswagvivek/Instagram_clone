import { Bookmark, Heart, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import CommentSection from './CommentSection';
import { deletePost, likePost, savePost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const PostCard = ({ post, compact = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const liked = (post.likes || []).some(
    (entry) => String(entry?._id || entry) === String(user?._id)
  );
  const saved = (post.saves || []).some(
    (entry) => String(entry?._id || entry) === String(user?._id)
  );
  const media = post.media?.[0];
  const canDelete =
    String(post.author?._id || post.author) === String(user?._id) || user?.role === 'admin';



  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this post permanently?');
    if (!confirmed) return;

    const result = await dispatch(deletePost(post._id));
    dispatch(
      showToast({
        tone: result.error ? 'error' : 'success',
        message: result.error ? result.payload || 'Unable to delete post.' : 'Post deleted.',
      })
    );
  };

  const handleDirectMessage = () => {
    if (!post.author?._id) {
      dispatch(showToast({ tone: 'error', message: 'Unable to open messages.' }));
      return;
    }
    navigate(`/messages?user=${post.author._id}`);
  };

  return (
    <article className={`ig-surface overflow-hidden rounded-lg ${compact ? '' : 'mb-4'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          to={`/profile/${post.author?.username}`}
          className="flex items-center gap-3"
          title={`Open ${post.author?.username}'s profile`}
        >
          <img
            src={post.author?.profilePicture?.url}
            alt={post.author?.username}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{post.author?.username}</p>
              {post.author?.isVerified && <Sparkles size={12} className="text-[#0095f6]" />}
            </div>
            <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
              {post.location || new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {post.isEdited && (
            <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">Edited</span>
          )}
          {post.isReel && (
            <span className="rounded bg-black px-2 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-black">
              Reel
            </span>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-[#8e8e8e] transition hover:text-[#ed4956]"
              aria-label="Delete post"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {media && (
        <div
          className="relative"
          onDoubleClick={() => {
            if (!liked) {
              dispatch(likePost({ postId: post._id, liked }));
            }
          }}
        >
          {media.type === 'video' ? (
            <video
              src={media.url}
              controls
              className={`w-full bg-black object-cover ${compact ? 'h-[520px]' : 'h-[585px]'}`}
            />
          ) : (
            <img
              src={media.url}
              alt={post.caption}
              className={`w-full object-cover ${compact ? 'h-[520px]' : 'h-[585px]'}`}
            />
          )}
          {post.moderation?.status === 'flagged' && (
            <div className="absolute left-4 top-4 rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
              Under review
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => dispatch(likePost({ postId: post._id, liked }))}
              className={liked ? 'text-[#ed4956]' : ''}
            >
              <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={() => setCommentsOpen((value) => !value)}>
              <MessageCircle size={24} />
            </button>
            <button type="button" onClick={handleDirectMessage}>
              <Send size={24} />
            </button>
          </div>
          <button type="button" onClick={() => dispatch(savePost({ postId: post._id, saved }))}>
            <Bookmark size={24} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="text-sm font-semibold">{post.likes?.length || 0} likes</div>

        <div className="space-y-1 text-sm">
          <p className="leading-[18px]">
            <Link
              to={`/profile/${post.author?.username}`}
              className="font-semibold hover:underline"
              title={`Open ${post.author?.username}'s profile`}
            >
              {post.author?.username}
            </Link>{' '}
            {post.caption}
          </p>
          {(post.stats?.commentsCount || 0) > 0 && (
            <button
              type="button"
              onClick={() => setCommentsOpen((value) => !value)}
              className="text-[#8e8e8e] dark:text-[#a8a8a8]"
            >
              {commentsOpen
                ? 'Hide comments'
                : `View all ${post.stats.commentsCount} comments`}
            </button>
          )}
        </div>

        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm text-[#00376b] dark:text-[#e0f1ff]">
            {post.hashtags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}

        <CommentSection postId={post._id} isOpen={commentsOpen} />
      </div>
    </article>
  );
};

export default PostCard;
