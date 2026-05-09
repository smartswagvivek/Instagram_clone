import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  createCollection,
  deleteCollection,
  fetchSavedPosts,
} from '../redux/slices/postsSlice';

const SavedPage = () => {
  const dispatch = useDispatch();
  const { savedPosts, collections } = useSelector((state) => state.posts.saved);
  const [activeCollection, setActiveCollection] = useState('All Posts');
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    dispatch(fetchSavedPosts());
  }, [dispatch]);

  const displayedPosts = useMemo(() => {
    if (activeCollection === 'All Posts') {
      return savedPosts;
    }

    return collections.find((collection) => collection.name === activeCollection)?.posts || [];
  }, [activeCollection, collections, savedPosts]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    const result = await dispatch(createCollection(newCollectionName.trim()));
    if (!result.error) {
      setActiveCollection(newCollectionName.trim());
      setNewCollectionName('');
    }
  };

  return (
    <div className="mx-auto max-w-[935px] px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Saved</h1>
        <p className="mt-2 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
          Only you can see what you&apos;ve saved
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {collections.map((collection) => (
          <button
            key={collection.name}
            type="button"
            onClick={() => setActiveCollection(collection.name)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              activeCollection === collection.name
                ? 'border-[#262626] bg-[#262626] text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-[#dbdbdb] dark:border-[#262626]'
            }`}
          >
            {collection.name} ({collection.posts?.length || 0})
          </button>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <input
          value={newCollectionName}
          onChange={(event) => setNewCollectionName(event.target.value)}
          placeholder="New collection name"
          className="ig-input max-w-xs"
        />
        <button type="button" onClick={handleCreateCollection} className="ig-button-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Create collection
        </button>
        {activeCollection !== 'All Posts' && (
          <button
            type="button"
            onClick={() => dispatch(deleteCollection(activeCollection))}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dbdbdb] px-4 py-2 text-sm font-semibold text-[#ed4956] dark:border-[#262626]"
          >
            <Trash2 size={16} />
            Delete collection
          </button>
        )}
      </div>

      <section className="grid grid-cols-3 gap-1">
        {displayedPosts.map((post) => (
          <div key={post._id} className="group relative aspect-square overflow-hidden bg-[#fafafa] dark:bg-[#121212]">
            <img src={post.media?.[0]?.url} alt={post.caption} className="h-full w-full object-cover" />
            <div className="absolute inset-0 hidden items-center justify-center bg-black/35 text-sm font-semibold text-white group-hover:flex">
              {post.author?.username}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default SavedPage;
