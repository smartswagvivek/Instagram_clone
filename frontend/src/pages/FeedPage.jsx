import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import PostCard from '../components/PostCard';
import StoryTray from '../components/feed/StoryTray';
import { fetchFeedPosts, fetchStories, resetFeed } from '../redux/slices/postsSlice';
import { fetchUnreadCount } from '../redux/slices/notificationSlice';
import { SkeletonPostList } from '../components/skeletons/PostSkeleton';
import EmptyStates from '../components/EmptyState';

const FeedPage = () => {
  const dispatch = useDispatch();
  const sentinelRef = useRef(null);
  const { feed, feedHasMore, feedPage, stories, loading } = useSelector((state) => state.posts);

  useEffect(() => {
    dispatch(fetchStories());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  useEffect(() => {
    dispatch(resetFeed());
    dispatch(fetchFeedPosts({ page: 1, mode: 'algorithmic' }));
  }, [dispatch]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && feedHasMore && !loading && feed.length > 0) {
        dispatch(fetchFeedPosts({ page: feedPage + 1, mode: 'algorithmic' }));
      }
    });

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [dispatch, feedHasMore, feedPage, feed.length, loading]);

  return (
    <div className="mx-auto max-w-[630px] px-4 py-8 md:px-0">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Home</h1>
      </div>

      <StoryTray stories={stories} />

      {loading && feed.length === 0 ? (
        <SkeletonPostList count={3} />
      ) : feed.length === 0 ? (
        EmptyStates.noFeed()
      ) : (
        feed.map((post) => (
          <PostCard key={post._id} post={post} />
        ))
      )}

      <div ref={sentinelRef} className="h-10" />

      {!feedHasMore && feed.length > 0 && (
        <div className="py-6 text-center text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
          You&apos;ve reached the end of the current feed.
        </div>
      )}
    </div>
  );
};

export default FeedPage;
