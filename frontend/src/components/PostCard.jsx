import { Bookmark, Heart, MessageCircle, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import CommentSection from './CommentSection';
import { deletePost, fetchStories, likePost, savePost, sharePost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const PostCard = ({ post, compact = false }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticSaved, setOptimisticSaved] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sharePending, setSharePending] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const liked = (post.likes || []).some(
    (entry) => String(entry?._id || entry) === String(user?._id)
  );
  const saved = (post.saves || []).some(
    (entry) => String(entry?._id || entry) === String(user?._id)
  );
  const media = post.media?.[0];
  const canDelete =
    String(post.author?._id || post.author) === String(user?._id) || user?.role === 'admin';
  const displayedLiked = pendingAction === 'like' ? optimisticLiked : liked;
  const displayedSaved = pendingAction === 'save' ? optimisticSaved : saved;
  const displayedLikesCount =
    (post.likes?.length || 0) + (displayedLiked === liked ? 0 : displayedLiked ? 1 : -1);
  const followingUsers = (user?.following || []).filter((entry) => entry && typeof entry === 'object');

  useEffect(() => {
    setOptimisticLiked(liked);
  }, [liked]);

  useEffect(() => {
    setOptimisticSaved(saved);
  }, [saved]);

  const handleLikeToggle = async () => {
    if (pendingAction === 'like') return;

    const nextLiked = !displayedLiked;
    setPendingAction('like');
    setOptimisticLiked(nextLiked);

    const result = await dispatch(likePost({ postId: post._id, liked: displayedLiked }));
    if (result.error) {
      setOptimisticLiked(displayedLiked);
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update like.' }));
    }

    setPendingAction((current) => (current === 'like' ? null : current));
  };

  const handleSaveToggle = async () => {
    if (pendingAction === 'save') return;

    const nextSaved = !displayedSaved;
    setPendingAction('save');
    setOptimisticSaved(nextSaved);

    const result = await dispatch(savePost({ postId: post._id, saved: displayedSaved }));
    if (result.error) {
      setOptimisticSaved(displayedSaved);
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update save.' }));
    }

    setPendingAction((current) => (current === 'save' ? null : current));
  };



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

  const handleShareToUser = async (recipientId) => {
    const result = await dispatch(
      sharePost({
        postId: post._id,
        recipientId,
        text: shareMessage,
      })
    );

    dispatch(
      showToast({
        tone: result.error ? 'error' : 'success',
        message: result.error ? result.payload || 'Unable to share post.' : 'Post shared successfully.',
      })
    );

    if (!result.error) {
      setIsShareOpen(false);
      setShareMessage('');
    }
  };

  const handleShareToStory = async () => {
    if (sharePending) return;

    setSharePending(true);
    const result = await dispatch(
      sharePost({
        postId: post._id,
        toStory: true,
        storyCaption: shareMessage,
      })
    );

    dispatch(
      showToast({
        tone: result.error ? 'error' : 'success',
        message: result.error ? result.payload || 'Unable to share to story.' : 'Shared to your story.',
      })
    );

    if (!result.error) {
      dispatch(fetchStories());
      setIsShareOpen(false);
      setShareMessage('');
    }

    setSharePending(false);
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
            if (!displayedLiked && pendingAction !== 'like') {
              handleLikeToggle();
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
              onClick={handleLikeToggle}
              className={displayedLiked ? 'text-[#ed4956]' : ''}
            >
              <Heart size={24} fill={displayedLiked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={() => setCommentsOpen((value) => !value)}>
              <MessageCircle size={24} />
            </button>
            <button type="button" onClick={() => setIsShareOpen(true)}>
              <Send size={24} />
            </button>
          </div>
          <button type="button" onClick={handleSaveToggle}>
            <Bookmark size={24} fill={displayedSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="text-sm font-semibold">{displayedLikesCount} likes</div>

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

      {isShareOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
          <div className="ig-surface w-full max-w-md rounded-3xl bg-white p-0 dark:bg-black">
            <div className="flex items-center justify-between border-b border-[#dbdbdb] px-5 py-4 dark:border-[#262626]">
              <div>
                <h3 className="text-base font-semibold">Share post</h3>
                <p className="mt-1 text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                  Send in chat or add it to your story
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="rounded-full p-2 text-[#8e8e8e] transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4">
              <textarea
                rows={3}
                value={shareMessage}
                onChange={(event) => setShareMessage(event.target.value)}
                placeholder="Write a message or story caption"
                className="ig-input"
              />

              <button
                type="button"
                onClick={handleShareToStory}
                disabled={sharePending}
                className="ig-button-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sharePending ? 'Sharing...' : 'Share to story'}
              </button>

              <div className="mt-5 space-y-3">
                {followingUsers.length === 0 ? (
                  <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                    Follow people to share posts directly in messages.
                  </p>
                ) : (
                  followingUsers.map((entry) => (
                    <button
                      key={entry._id}
                      type="button"
                      onClick={() => handleShareToUser(entry._id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
                    >
                      <img
                        src={entry.profilePicture?.url}
                        alt={entry.username}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">{entry.username}</p>
                        <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                          {entry.fullName || 'Instagraam user'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
