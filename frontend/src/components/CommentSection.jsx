import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import {
  addComment,
  deleteComment,
  fetchComments,
  toggleCommentLike,
} from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const formatTimestamp = (value) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const CommentNode = ({ comment, postId, authUser, dispatch, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const canDelete =
    String(comment.author?._id) === String(authUser?._id) || authUser?.role === 'admin';
  const liked = (comment.likes || []).some(
    (entry) => String(entry?._id || entry) === String(authUser?._id)
  );

  const handleReply = async (event) => {
    event.preventDefault();
    if (!replyText.trim()) return;

    const result = await dispatch(
      addComment({ postId, text: replyText.trim(), parentCommentId: comment._id })
    );

    if (!result.error) {
      setReplyText('');
      setShowReplyForm(false);
      dispatch(showToast({ tone: 'success', message: 'Reply posted.' }));
      return;
    }

    dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to post reply.' }));
  };

  return (
    <div className={`${depth > 0 ? 'ml-7 border-l border-[#efefef] pl-4 dark:border-[#1a1a1a]' : ''}`}>
      <div className="flex items-start gap-3">
        <Link to={`/profile/${comment.author?.username}`} title={`Open ${comment.author?.username}'s profile`}>
          <img
            src={comment.author?.profilePicture?.url}
            alt={comment.author?.username}
            className="h-8 w-8 rounded-full object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-[18px]">
            <Link
              to={`/profile/${comment.author?.username}`}
              className="mr-2 font-semibold hover:underline"
              title={`Open ${comment.author?.username}'s profile`}
            >
              {comment.author?.username}
            </Link>
            {comment.text}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
            <span>{formatTimestamp(comment.createdAt)}</span>
            <button
              type="button"
              onClick={() =>
                dispatch(toggleCommentLike({ postId, commentId: comment._id, liked }))
              }
              className={`flex items-center gap-1 ${liked ? 'text-[#ed4956]' : ''}`}
            >
              <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
              <span>{comment.likes?.length || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReplyForm((value) => !value)}
              className="flex items-center gap-1"
            >
              <MessageCircle size={12} />
              <span>Reply</span>
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => dispatch(deleteComment({ postId, commentId: comment._id }))}
                className="flex items-center gap-1 transition hover:text-[#ed4956]"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            )}
          </div>

          {showReplyForm && (
            <form onSubmit={handleReply} className="mt-3 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={`Reply to ${comment.author?.username}...`}
                className="ig-input"
              />
              <button type="submit" className="text-sm font-semibold text-[#0095f6]">
                Post
              </button>
            </form>
          )}
        </div>
      </div>

      {(comment.replies || []).length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply._id}
              comment={reply}
              postId={postId}
              authUser={authUser}
              dispatch={dispatch}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ postId, isOpen }) => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const comments = useSelector((state) => state.posts.commentsByPost[postId] || []);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchComments(postId));
    }
  }, [dispatch, isOpen, postId]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    const result = await dispatch(addComment({ postId, text: draft.trim() }));
    if (!result.error) {
      setDraft('');
      dispatch(showToast({ tone: 'success', message: 'Comment posted.' }));
      return;
    }

    dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to post comment.' }));
  };

  return (
    <div className="space-y-3 border-t border-[#efefef] pt-3 dark:border-[#1a1a1a]">
      <div className="max-h-[280px] space-y-4 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
            No comments yet. Start the conversation.
          </p>
        )}

        {comments.map((comment) => (
          <CommentNode
            key={comment._id}
            comment={comment}
            postId={postId}
            authUser={authUser}
            dispatch={dispatch}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a comment..."
          className="ig-input"
        />
        <button type="submit" className="text-sm font-semibold text-[#0095f6]">
          Post
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
