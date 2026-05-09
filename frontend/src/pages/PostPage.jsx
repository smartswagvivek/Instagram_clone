import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import api from '../services/api';
import CommentSection from '../components/CommentSection';
import { likePost, savePost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const PostPage = () => {
  const { postId } = useParams();
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/posts/${postId}`);
        if (!cancelled) {
          setPost(data.post);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.message || 'Unable to load this post.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const liked = (post?.likes || []).some((entry) => String(entry?._id || entry) === String(authUser?._id));
  const saved = (post?.saves || []).some((entry) => String(entry?._id || entry) === String(authUser?._id));

  const updateLocalPostRef = (key, shouldInclude) => {
    setPost((current) => {
      if (!current || !authUser?._id) return current;

      const list = current[key] || [];
      const withoutUser = list.filter((entry) => String(entry?._id || entry) !== String(authUser._id));
      return {
        ...current,
        [key]: shouldInclude ? [...withoutUser, authUser._id] : withoutUser,
      };
    });
  };

  const handleLikeToggle = async () => {
    if (!post) return;

    const result = await dispatch(likePost({ postId: post._id, liked }));
    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update like.' }));
      return;
    }

    updateLocalPostRef('likes', !liked);
  };

  const handleSaveToggle = async () => {
    if (!post) return;

    const result = await dispatch(savePost({ postId: post._id, saved }));
    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update saved post.' }));
      return;
    }

    updateLocalPostRef('saves', !saved);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[935px] px-4 py-8">
        <div className="ig-surface rounded-2xl p-6 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
          Loading post...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-[935px] px-4 py-8">
        <div className="ig-surface rounded-2xl p-6 text-sm text-[#ed4956]">
          {error || 'Post not found.'}
        </div>
      </div>
    );
  }

  const media = post.media?.[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <article className="ig-surface grid overflow-hidden rounded-2xl bg-white dark:bg-black md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-[420px] items-center justify-center bg-black">
          {media?.type === 'video' ? (
            <video src={media.url} controls className="max-h-[82vh] w-full object-contain" />
          ) : (
            <img src={media?.url} alt={post.caption} className="max-h-[82vh] w-full object-contain" />
          )}
        </div>

        <div className="flex min-h-[420px] flex-col">
          <div className="flex items-center gap-3 border-b border-[#dbdbdb] px-5 py-4 dark:border-[#262626]">
            <Link to={`/profile/${post.author?.username}`}>
              <img
                src={post.author?.profilePicture?.url}
                alt={post.author?.username}
                className="h-10 w-10 rounded-full object-cover"
              />
            </Link>
            <div>
              <Link to={`/profile/${post.author?.username}`} className="text-sm font-semibold hover:underline">
                {post.author?.username}
              </Link>
              <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                {post.location || new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <p className="text-sm leading-6">
              <Link to={`/profile/${post.author?.username}`} className="font-semibold hover:underline">
                {post.author?.username}
              </Link>{' '}
              {post.caption || 'No caption added yet.'}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLikeToggle}
                className={`rounded-full p-2 transition ${liked ? 'text-[#ed4956]' : 'text-[#8e8e8e] hover:text-[#ed4956]'}`}
                aria-label={liked ? 'Unlike post' : 'Like post'}
              >
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => setCommentsOpen((value) => !value)}
                className="rounded-full p-2 text-[#8e8e8e] hover:text-[#0095f6]"
                aria-label="Show comments"
              >
                <MessageCircle size={22} />
              </button>
              <button
                type="button"
                onClick={handleSaveToggle}
                className={`rounded-full p-2 transition ${saved ? 'text-[#0095f6]' : 'text-[#8e8e8e] hover:text-[#0095f6]'}`}
                aria-label={saved ? 'Unsave post' : 'Save post'}
              >
                <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <p className="mt-2 text-sm font-semibold">{post.likes?.length || 0} likes</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[#8e8e8e] dark:text-[#a8a8a8]">
              {new Date(post.createdAt).toLocaleString()}
            </p>

            <div className="mt-4">
              <CommentSection postId={post._id} isOpen={commentsOpen} />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default PostPage;
