import { Bookmark, Camera, Heart, Lock, MessageCircle, Unlock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { loadCurrentUser, setAuthenticatedUser } from '../redux/slices/authSlice';
import {
  acceptFollowRequest,
  fetchFollowRequests,
  fetchProfile,
  followUser,
  rejectFollowRequest,
  removeProfilePhoto,
  unfollowUser,
  updateProfile,
  uploadProfilePicture,
  likePost,
  savePost,
} from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';
import CommentSection from '../components/CommentSection';
import { ProfileGridSkeleton } from '../components/skeletons/ProfileSkeleton';
import EmptyStates from '../components/EmptyState';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { identifier } = useParams();
  const authUser = useSelector((state) => state.auth.user);
  const profile = useSelector((state) => state.posts.profile);
  const profileStatus = useSelector((state) => state.posts.profileStatus);
  const { user, posts, canViewPosts, isFollowing, hasPendingRequest } = profile;
  const [isEditing, setIsEditing] = useState(false);
  const [activeList, setActiveList] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [isPostCommentsOpen, setIsPostCommentsOpen] = useState(true);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    bio: '',
    website: '',
    isPrivate: false,
  });

  const selectedPost = selectedPostId ? posts.find((post) => post._id === selectedPostId) : null;

  useEffect(() => {
    if (authUser?._id) {
      dispatch(fetchProfile({ identifier: identifier || authUser._id }));
    }
  }, [authUser?._id, dispatch, identifier]);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        fullName: user.fullName || '',
        bio: user.bio || '',
        website: user.website || '',
        isPrivate: Boolean(user.isPrivate),
      });
    }
  }, [user]);

  useEffect(() => {
    if (authUser?._id && (!identifier || String(identifier) === String(authUser._id) || identifier === authUser.username)) {
      dispatch(fetchFollowRequests());
    }
  }, [authUser?._id, dispatch, identifier, authUser?.username]);

  const isOwnProfile = String(user?._id) === String(authUser?._id);
  const followsYou = (authUser?.followers || []).some(
    (entry) => String(entry?._id || entry) === String(user?._id)
  );

  const selectedPostAuthor = selectedPost?.author || user;
  const postLiked = (selectedPost?.likes || []).some(
    (entry) => String(entry?._id || entry) === String(authUser?._id)
  );
  const postSaved = (selectedPost?.saves || []).some(
    (entry) => String(entry?._id || entry) === String(authUser?._id)
  );

  const handleSelectedPostLike = async () => {
    if (!selectedPost) return;
    const result = await dispatch(likePost({ postId: selectedPost._id, liked: postLiked }));
    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update like.' }));
      return;
    }

    dispatch(showToast({
      tone: 'success',
      message: postLiked ? 'Post unliked.' : 'Post liked.',
    }));
  };

  const handleSelectedPostSave = async () => {
    if (!selectedPost) return;
    const result = await dispatch(savePost({ postId: selectedPost._id, saved: postSaved }));
    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update saved post.' }));
      return;
    }

    dispatch(showToast({
      tone: 'success',
      message: postSaved ? 'Post removed from saved.' : 'Post saved successfully.',
    }));
  };

  const formatTimestamp = (value) =>
    new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (!user && profileStatus === 'loading') {
    return (
      <div className="mx-auto max-w-[935px] px-4 py-8">
        <div className="ig-surface rounded-2xl p-6 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleFollowToggle = async () => {
    const result = await dispatch(isFollowing || hasPendingRequest ? unfollowUser(user._id) : followUser(user._id));

    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update follow.' }));
      return;
    }

    if (!isFollowing && !hasPendingRequest && result.payload?.status === 'following') {
      dispatch(setAuthenticatedUser({ ...authUser, following: [...(authUser?.following || []), user._id] }));
    }

    if ((isFollowing || hasPendingRequest) && authUser?.following) {
      dispatch(
        setAuthenticatedUser({
          ...authUser,
          following: (authUser.following || []).filter(
            (entry) => String(entry?._id || entry) !== String(user._id)
          ),
          followRequestsSent: (authUser.followRequestsSent || []).filter(
            (entry) => String(entry?._id || entry) !== String(user._id)
          ),
        })
      );
    }

    dispatch(fetchProfile({ identifier: identifier || user._id }));
    dispatch(
      showToast({
        tone: 'success',
        message:
          result.payload?.status === 'requested'
            ? `Follow request sent to ${user.username}.`
            : isFollowing
              ? `You unfollowed ${user.username}.`
              : hasPendingRequest
                ? `Follow request removed.`
                : `You followed ${user.username}.`,
      })
    );
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    let nextUser = authUser;
    const profileResult = await dispatch(updateProfile(form));
    if (profileResult.error) {
      dispatch(showToast({ tone: 'error', message: profileResult.payload || 'Unable to save profile.' }));
      return;
    }
    nextUser = { ...nextUser, ...profileResult.payload };

    if (avatarFile) {
      const avatarResult = await dispatch(uploadProfilePicture(avatarFile));
      if (avatarResult.error) {
        dispatch(showToast({ tone: 'error', message: avatarResult.payload || 'Avatar upload failed.' }));
        return;
      }
      nextUser = { ...nextUser, ...avatarResult.payload };
    }

    dispatch(setAuthenticatedUser(nextUser));
    dispatch(fetchProfile({ identifier: nextUser._id }));
    setAvatarFile(null);
    setIsEditing(false);
    dispatch(showToast({ tone: 'success', message: 'Profile updated successfully.' }));
  };

  const handleRemovePhoto = async () => {
    const result = await dispatch(removeProfilePhoto());
    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to remove profile photo.' }));
      return;
    }

    dispatch(setAuthenticatedUser({ ...authUser, ...result.payload }));
    dispatch(fetchProfile({ identifier: authUser._id }));
    dispatch(showToast({ tone: 'success', message: 'Profile photo removed.' }));
  };

  const handleRequestDecision = async (requestUserId, action) => {
    const result = await dispatch(
      action === 'accept' ? acceptFollowRequest(requestUserId) : rejectFollowRequest(requestUserId)
    );

    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update request.' }));
      return;
    }

    dispatch(loadCurrentUser());
    dispatch(fetchProfile({ identifier: authUser._id }));
    dispatch(
      showToast({
        tone: 'success',
        message: action === 'accept' ? 'Follow request accepted.' : 'Follow request rejected.',
      })
    );
  };

  return (
    <div className="mx-auto max-w-[935px] px-4 py-8">
      <section className="border-b border-[#dbdbdb] pb-11 dark:border-[#262626]">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:px-8">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(true)}
              className="block overflow-hidden rounded-full focus:outline-none"
              aria-label="Open profile photo"
            >
              <img
                src={user.profilePicture?.url}
                alt={user.username}
                className="h-[120px] w-[120px] rounded-full object-cover transition hover:scale-[1.02] md:h-[150px] md:w-[150px]"
              />
            </button>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute bottom-1 right-1 rounded-full bg-[#0095f6] p-2 text-white"
                aria-label="Edit profile"
              >
                <Camera size={16} />
              </button>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-normal">{user.username}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1 text-xs font-semibold dark:bg-[#121212]">
                {user.isPrivate ? <Lock size={12} /> : <Unlock size={12} />}
                {user.isPrivate ? 'Private' : 'Public'}
              </span>
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg bg-[#efefef] px-4 py-1.5 text-sm font-semibold dark:bg-[#262626]"
                >
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    className={
                      isFollowing || hasPendingRequest
                        ? 'rounded-lg bg-[#efefef] px-4 py-1.5 text-sm font-semibold dark:bg-[#262626]'
                        : 'ig-button-primary'
                    }
                  >
                    {isFollowing
                      ? 'Following'
                      : hasPendingRequest
                        ? 'Requested'
                        : followsYou
                          ? 'Follow Back'
                          : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?user=${user._id}`)}
                    className="rounded-lg bg-[#0095f6] px-4 py-1.5 text-sm font-semibold text-white"
                  >
                    Message
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-6 text-base">
              <span>
                <strong>{canViewPosts ? posts?.length || 0 : 0}</strong> posts
              </span>
              <button type="button" onClick={() => setActiveList('followers')}>
                <strong>{user.followers?.length || 0}</strong> followers
              </button>
              <button type="button" onClick={() => setActiveList('following')}>
                <strong>{user.following?.length || 0}</strong> following
              </button>
              {isOwnProfile && (
                <button type="button" onClick={() => setActiveList('followRequestsReceived')}>
                  <strong>{user.followRequestsReceived?.length || 0}</strong> requests
                </button>
              )}
            </div>
            <p className="mt-5 text-sm font-semibold">{user.fullName || user.username}</p>
            <p className="mt-1 text-sm">{user.bio || 'No bio yet.'}</p>
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[#00376b] dark:text-[#e0f1ff]"
              >
                {user.website}
              </a>
            )}
          </div>
        </div>
      </section>

      {!canViewPosts && !isOwnProfile ? (
        <section className="py-16 text-center">
          <Lock size={28} className="mx-auto mb-3" />
          <p className="text-lg font-semibold">This account is private</p>
          <p className="mt-2 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
            Follow {user.username} to see their photos, videos, and stories.
          </p>
        </section>
      ) : profileStatus === 'loading' ? (
        <section className="mt-8">
          <ProfileGridSkeleton />
        </section>
      ) : posts?.length === 0 ? (
        <section className="mt-8">
          {EmptyStates.noPosts()}
        </section>
      ) : (
        <section className="mt-8 grid grid-cols-3 gap-1">
          {posts?.map((post) => (
            <button
              type="button"
              key={post._id}
              onClick={() => setSelectedPostId(post._id)}
              className="group relative aspect-square overflow-hidden bg-[#fafafa] dark:bg-[#121212]"
            >
              <img src={post.media?.[0]?.url} alt={post.caption} className="h-full w-full object-cover" />
              <div className="absolute inset-0 hidden items-center justify-center bg-black/40 text-sm font-semibold text-white group-hover:flex">
                {post.likes?.length || 0} likes
              </div>
            </button>
          ))}
        </section>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="ig-surface w-full max-w-sm rounded-2xl bg-white p-4 dark:bg-black">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Edit profile</h2>
              <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-[#8e8e8e]">
                Close
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-3">
              <div>
                <label className="mb-0.5 block text-xs font-medium">Username</label>
                <input
                  className="ig-input"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value.toLowerCase() }))}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium">Full name</label>
                <input
                  className="ig-input"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium">Bio</label>
                <textarea
                  rows={3}
                  className="ig-input"
                  value={form.bio}
                  onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium">Website</label>
                <input
                  className="ig-input"
                  value={form.website}
                  onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                />
              </div>
              <label className="flex items-center justify-between rounded-lg border border-[#dbdbdb] px-3 py-2 text-xs dark:border-[#262626]">
                <span className="font-medium">Private account</span>
                <input
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={() => setForm((prev) => ({ ...prev, isPrivate: !prev.isPrivate }))}
                />
              </label>
              <div>
                <label className="mb-0.5 block text-xs font-medium">Profile picture</label>
                <input
                  type="file"
                  accept="image/*"
                  className="ig-input"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                />
              </div>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="w-full rounded-lg border border-[#dbdbdb] px-3 py-2 text-xs font-semibold text-[#ed4956] dark:border-[#262626]"
              >
                Remove Photo
              </button>
              <button type="submit" className="ig-button-primary w-full text-sm">
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      {activeList && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="ig-surface w-full max-w-lg rounded-2xl bg-white p-0 dark:bg-black">
            <div className="flex items-center justify-between border-b border-[#dbdbdb] px-5 py-4 dark:border-[#262626]">
              <h2 className="text-base font-semibold capitalize">
                {activeList === 'followRequestsReceived' ? 'Follow Requests' : activeList}
              </h2>
              <button type="button" onClick={() => setActiveList(null)} className="text-sm text-[#8e8e8e]">
                Close
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-4">
              {(user[activeList] || []).length === 0 && (
                <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">No users to show yet.</p>
              )}

              <div className="space-y-4">
                {(user[activeList] || []).map((entry) => (
                  <div key={entry._id} className="flex items-center justify-between gap-3">
                    <Link
                      to={`/profile/${entry.username}`}
                      onClick={() => setActiveList(null)}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={entry.profilePicture?.url}
                        alt={entry.username}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">{entry.username}</p>
                        <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                          {entry.fullName || 'Instagram user'}
                        </p>
                      </div>
                    </Link>

                    {activeList === 'followRequestsReceived' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRequestDecision(entry._id, 'accept')}
                          className="ig-button-primary"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDecision(entry._id, 'reject')}
                          className="rounded-lg bg-[#efefef] px-3 py-2 text-sm font-semibold dark:bg-[#262626]"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAvatarPreviewOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4"
        >
          <div className="relative max-w-[420px]">
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
              aria-label="Close profile photo"
            >
              <X size={18} />
            </button>
            <img
              src={user.profilePicture?.url}
              alt={user.username}
              className="max-h-[80vh] w-full rounded-3xl object-contain"
            />
          </div>
        </div>
      )}

      {selectedPost && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 px-4 py-6"
        >
          <div
            className="ig-surface grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white dark:bg-black md:grid-cols-[minmax(0,1fr)_360px]"
          >
            <div className="flex items-center justify-center bg-black">
              {selectedPost.media?.[0]?.type === 'video' ? (
                <video
                  src={selectedPost.media?.[0]?.url}
                  controls
                  autoPlay
                  className="max-h-[90vh] w-full object-contain"
                />
              ) : (
                <img
                  src={selectedPost.media?.[0]?.url}
                  alt={selectedPost.caption}
                  className="max-h-[90vh] w-full object-contain"
                />
              )}
            </div>

            <div className="flex min-h-[320px] flex-col">
              <div className="flex items-center justify-between border-b border-[#dbdbdb] px-5 py-4 dark:border-[#262626]">
                <Link
                to={`/profile/${user.username}`}
                className="flex items-center gap-3"
                title={`Open ${user.username}'s profile`}
              >
                <img
                  src={user.profilePicture?.url}
                  alt={user.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{user.username}</p>
                  <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                    {selectedPost.location || formatTimestamp(selectedPost.createdAt)}
                  </p>
                </div>
              </Link>
                <button
                  type="button"
                  onClick={() => setSelectedPostId(null)}
                  className="rounded-full p-2 text-[#8e8e8e] transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
                  aria-label="Close post"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex items-start gap-3">
                  <Link
                    to={`/profile/${selectedPostAuthor?.username}`}
                    className="flex items-center gap-2"
                    title={`Open ${selectedPostAuthor?.username}'s profile`}
                  >
                    <img
                      src={selectedPostAuthor?.profilePicture?.url}
                      alt={selectedPostAuthor?.username}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <p className="text-sm font-semibold">{selectedPostAuthor?.username}</p>
                  </Link>
                  <div className="min-w-0">
                    <p className="text-sm leading-6">
                      {selectedPost?.caption || 'No caption added yet.'}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-[#8e8e8e] dark:text-[#a8a8a8]">
                      {formatTimestamp(selectedPost?.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectedPostLike}
                    className={`rounded-full p-2 transition ${postLiked ? 'text-[#ed4956]' : 'text-[#8e8e8e] hover:text-[#ed4956]'}`}
                    aria-label={postLiked ? 'Unlike post' : 'Like post'}
                  >
                    <Heart size={22} fill={postLiked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPostCommentsOpen((value) => !value)}
                    className="rounded-full p-2 text-[#8e8e8e] hover:text-[#0095f6]"
                    aria-label="Show/hide comments"
                  >
                    <MessageCircle size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectedPostSave}
                    className={`rounded-full p-2 transition ${postSaved ? 'text-[#0095f6]' : 'text-[#8e8e8e] hover:text-[#0095f6]'}`}
                    aria-label={postSaved ? 'Unsave post' : 'Save post'}
                  >
                    <Bookmark size={22} fill={postSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="text-sm font-semibold">{selectedPost?.likes?.length || 0} likes</div>

                <CommentSection postId={selectedPost?._id} isOpen={isPostCommentsOpen} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
