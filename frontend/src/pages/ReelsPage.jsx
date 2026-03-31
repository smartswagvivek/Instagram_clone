import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchReels } from '../redux/slices/postsSlice';

const ReelsPage = () => {
  const dispatch = useDispatch();
  const reels = useSelector((state) => state.posts.reels);

  useEffect(() => {
    dispatch(fetchReels());
  }, [dispatch]);

  return (
    <div className="mx-auto max-w-[470px] px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Reels</h1>
      <div className="space-y-6">
        {reels.map((post) => (
          <article key={post._id} className="ig-surface overflow-hidden rounded-xl">
            <div className="relative h-[720px] bg-black">
              {post.media?.[0]?.type === 'video' ? (
                <video src={post.media[0].url} controls className="h-full w-full object-cover" />
              ) : (
                <img
                  src={post.media?.[0]?.url}
                  alt={post.caption}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
                <p className="text-sm font-semibold">{post.author?.username}</p>
                <p className="mt-2 text-sm leading-[18px]">{post.caption}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ReelsPage;
