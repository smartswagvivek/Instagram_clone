import { Bookmark, Heart, MessageCircle, Send } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchReels, likePost, savePost, sharePost } from '../redux/slices/postsSlice';

const ReelsPage = () => {
  const dispatch = useDispatch();
  const reels = useSelector((state) => state.posts.reels);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchReels());
  }, [dispatch]);

  return (
    <div className="mx-auto max-w-[540px] px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Reels</h1>
      <div className="h-[calc(100vh-140px)] snap-y snap-mandatory space-y-6 overflow-y-auto">
        {reels.map((post) => {
          const liked = (post.likes || []).some((entry) => String(entry?._id || entry) === String(user?._id));
          const saved = (post.saves || []).some((entry) => String(entry?._id || entry) === String(user?._id));

          return (
            <article
              key={post._id}
              className="ig-surface relative h-[82vh] snap-start overflow-hidden rounded-[32px] bg-black"
            >
              {post.media?.[0]?.type === 'video' ? (
                <video src={post.media[0].url} controls className="h-full w-full object-cover" />
              ) : (
                <img src={post.media?.[0]?.url} alt={post.caption} className="h-full w-full object-cover" />
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black via-black/55 to-transparent p-6 text-white">
                <div className="max-w-[75%]">
                  <p className="text-base font-semibold">@{post.author?.username}</p>
                  <p className="mt-2 text-sm leading-6">{post.caption}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/70">
                    {post.location || 'Original audio'}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-5">
                  <button type="button" onClick={() => dispatch(likePost({ postId: post._id, liked }))}>
                    <Heart size={24} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-[#ed4956]' : ''} />
                    <span className="mt-1 block text-center text-xs">{post.likes?.length || 0}</span>
                  </button>
                  <button type="button">
                    <MessageCircle size={24} />
                    <span className="mt-1 block text-center text-xs">{post.stats?.commentsCount || 0}</span>
                  </button>
                  <button type="button" onClick={() => dispatch(sharePost({ postId: post._id, toStory: true }))}>
                    <Send size={24} />
                    <span className="mt-1 block text-center text-xs">{post.stats?.sharesCount || 0}</span>
                  </button>
                  <button type="button" onClick={() => dispatch(savePost({ postId: post._id, saved }))}>
                    <Bookmark size={24} fill={saved ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default ReelsPage;
