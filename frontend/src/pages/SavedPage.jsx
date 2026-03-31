import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchSavedPosts } from '../redux/slices/postsSlice';

const SavedPage = () => {
  const dispatch = useDispatch();
  const { savedPosts, collections } = useSelector((state) => state.posts.saved);

  useEffect(() => {
    dispatch(fetchSavedPosts());
  }, [dispatch]);

  return (
    <div className="mx-auto max-w-[935px] px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Saved</h1>
        <p className="mt-2 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
          Only you can see what you&apos;ve saved
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {collections.map((collection) => (
          <div
            key={collection.name}
            className="rounded-full border border-[#dbdbdb] px-4 py-2 text-sm dark:border-[#262626]"
          >
            {collection.name} ({collection.posts?.length || 0})
          </div>
        ))}
      </div>

      <section className="grid grid-cols-3 gap-1">
        {savedPosts.map((post) => (
          <div key={post._id} className="aspect-square overflow-hidden bg-[#fafafa] dark:bg-[#121212]">
            <img src={post.media?.[0]?.url} alt={post.caption} className="h-full w-full object-cover" />
          </div>
        ))}
      </section>
    </div>
  );
};

export default SavedPage;
