import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import PostCard from '../components/PostCard';
import { setAuthenticatedUser } from '../redux/slices/authSlice';
import {
  fetchExplorePosts,
  fetchReels,
  followUser,
  resetExplore,
  searchUsers,
  unfollowUser,
} from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const ExplorePage = () => {
  const dispatch = useDispatch();
  const { explore, reels, userSearchResults } = useSelector((state) => state.posts);
  const authUser = useSelector((state) => state.auth.user);
  const [query, setQuery] = useState('');

  useEffect(() => {
    dispatch(resetExplore());
    dispatch(fetchExplorePosts({ page: 1 }));
    dispatch(fetchReels());
  }, [dispatch]);

  useEffect(() => {
    const nextQuery = query.trim();
    const timeoutId = window.setTimeout(() => {
      dispatch(resetExplore());

      if (!nextQuery) {
        dispatch(fetchExplorePosts({ page: 1 }));
        return;
      }

      dispatch(fetchExplorePosts({ page: 1, q: nextQuery }));
      dispatch(searchUsers(nextQuery));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, query]);

  const handleFollowToggle = async (targetUserId) => {
    const isFollowing = (authUser?.following || []).some(
      (entry) => String(entry?._id || entry) === String(targetUserId)
    );
    const isRequested = (authUser?.followRequestsSent || []).some(
      (entry) => String(entry?._id || entry) === String(targetUserId)
    );

    const result = await dispatch(
      isFollowing || isRequested ? unfollowUser(targetUserId) : followUser(targetUserId)
    );

    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update follow.' }));
      return;
    }

    const nextFollowing = isFollowing
      ? (authUser?.following || []).filter(
          (entry) => String(entry?._id || entry) !== String(targetUserId)
        )
      : result.payload?.status === 'following'
        ? [...(authUser?.following || []), targetUserId]
        : authUser?.following || [];

    const nextFollowRequestsSent =
      result.payload?.status === 'requested'
        ? [...(authUser?.followRequestsSent || []), targetUserId]
        : (authUser?.followRequestsSent || []).filter(
            (entry) => String(entry?._id || entry) !== String(targetUserId)
          );

    dispatch(
      setAuthenticatedUser({
        ...authUser,
        following: nextFollowing,
        followRequestsSent: nextFollowRequestsSent,
      })
    );
    dispatch(
      showToast({
        tone: 'success',
        message:
          result.payload?.status === 'requested'
            ? 'Follow request sent.'
            : isFollowing || isRequested
              ? 'Follow state updated.'
              : 'User followed.',
      })
    );
  };

  return (
    <div className="mx-auto max-w-[975px] space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Explore</h1>
          <p className="mt-1 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
            Search every account and discover trending posts.
          </p>
        </div>

        <div className="flex w-full max-w-md gap-3">
          <input
            className="ig-input"
            placeholder="Search users, hashtags, captions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {query.trim() && (
        <section className="ig-surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">People</h2>
            <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
              {userSearchResults.length} results
            </span>
          </div>

          <div className="space-y-4">
            {userSearchResults.length === 0 && (
              <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                No matching users found yet.
              </p>
            )}

            {userSearchResults.map((user) => {
              const isOwnProfile = String(user._id) === String(authUser?._id);
              const isFollowing = (authUser?.following || []).some(
                (entry) => String(entry?._id || entry) === String(user._id)
              );
              const isRequested = (authUser?.followRequestsSent || []).some(
                (entry) => String(entry?._id || entry) === String(user._id)
              );
              const followsYou = (authUser?.followers || []).some(
                (entry) => String(entry?._id || entry) === String(user._id)
              );
              const actionLabel = isFollowing
                ? 'Following'
                : isRequested
                  ? 'Requested'
                  : followsYou
                    ? 'Follow Back'
                    : 'Follow';

              return (
                <div key={user._id} className="flex items-center justify-between gap-4">
                  <Link to={`/profile/${user.username}`} className="flex min-w-0 items-center gap-3">
                    <img
                      src={user.profilePicture?.url}
                      alt={user.username}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.username}</p>
                      <p className="truncate text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                        {user.fullName || user.bio || 'Instagram user'} {user.isPrivate ? '• Private' : '• Public'}
                      </p>
                    </div>
                  </Link>

                  {!isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => handleFollowToggle(user._id)}
                      className={
                        isFollowing || isRequested
                          ? 'rounded-lg bg-[#efefef] px-4 py-2 text-sm font-semibold dark:bg-[#262626]'
                          : 'ig-button-primary'
                      }
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <p className="mb-4 text-sm font-semibold text-[#8e8e8e] dark:text-[#a8a8a8]">Trending reels</p>
        <div className="grid gap-4 md:grid-cols-3">
          {reels.map((post) => (
            <PostCard key={post._id} post={post} compact />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-1">
        {explore.map((post) => (
          <Link
            key={post._id}
            to={`/profile/${post.author?.username || post.author?._id}`}
            className="relative aspect-square overflow-hidden bg-[#fafafa] dark:bg-[#121212]"
          >
            <img src={post.media?.[0]?.url} alt={post.caption} className="h-full w-full object-cover" />
          </Link>
        ))}
      </section>
    </div>
  );
};

export default ExplorePage;
