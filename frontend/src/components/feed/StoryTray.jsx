import { ChevronLeft, ChevronRight, Eye, Heart, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import api from '../../services/api';

const STORY_DURATION_MS = 5000;

const StoryTray = ({ stories = [] }) => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [activeStory, setActiveStory] = useState(null);
  const [viewedStoryIds, setViewedStoryIds] = useState([]);
  const [isViewerListOpen, setIsViewerListOpen] = useState(false);

  const isStoryViewedByUser = (story, userId) =>
    (story?.viewers || []).some(
      (entry) => String(entry?.user?._id || entry?.user || entry?._id || entry) === String(userId)
    );

  useEffect(() => {
    if (!authUser?._id) {
      setViewedStoryIds([]);
      return;
    }

    setViewedStoryIds(
      stories
        .filter((story) => isStoryViewedByUser(story, authUser._id))
        .map((story) => story._id)
    );
  }, [authUser?._id, stories]);

  useEffect(() => {
    if (activeStoryIndex === null) {
      setActiveStory(null);
      return;
    }

    const nextStory = stories[activeStoryIndex];
    if (!nextStory) {
      setActiveStoryIndex(null);
      setActiveStory(null);
      return;
    }

    setActiveStory((current) => ({
      ...(current && current._id === nextStory._id ? current : nextStory),
      ...nextStory,
    }));
  }, [activeStoryIndex, stories]);

  useEffect(() => {
    if (!activeStory) return undefined;

    const timer = window.setTimeout(() => {
      setActiveStoryIndex((current) => {
        if (current === null) return null;
        return current < stories.length - 1 ? current + 1 : null;
      });
    }, STORY_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeStory, stories.length]);

  useEffect(() => {
    if (!activeStory) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveStoryIndex(null);
        return;
      }

      if (event.key === 'ArrowRight') {
        setActiveStoryIndex((current) =>
          current === null ? current : Math.min(current + 1, stories.length - 1)
        );
      }

      if (event.key === 'ArrowLeft') {
        setActiveStoryIndex((current) => (current === null ? current : Math.max(current - 1, 0)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStory, stories.length]);

  const storyProgressStyle = useMemo(
    () => ({ animation: activeStory ? `story-progress ${STORY_DURATION_MS}ms linear forwards` : 'none' }),
    [activeStory]
  );

  const storyGroups = useMemo(() => {
    const groupsByAuthor = new Map();

    stories.forEach((story, index) => {
      const authorId = String(story.author?._id || story.author || story._id);
      const existingGroup = groupsByAuthor.get(authorId);
      const storyWithIndex = { story, index };

      if (existingGroup) {
        existingGroup.items.push(storyWithIndex);
        return;
      }

      groupsByAuthor.set(authorId, {
        id: authorId,
        author: story.author,
        items: [storyWithIndex],
      });
    });

    return Array.from(groupsByAuthor.values());
  }, [stories]);

  const openStory = async (story, index) => {
    setActiveStoryIndex(index);
    setActiveStory((current) => ({
      ...(current || story),
      ...story,
      viewers: isStoryViewedByUser(story, authUser?._id)
        ? story.viewers
        : [...(story.viewers || []), { user: authUser?._id, viewedAt: new Date().toISOString() }],
    }));
    setViewedStoryIds((current) => (current.includes(story._id) ? current : [...current, story._id]));

    try {
      await api.post(`/stories/${story._id}/view`);
    } catch (_error) {
      // Story view tracking should not block playback.
    }
  };

  const openStoryGroup = (group) => {
    const firstUnviewed = group.items.find(({ story }) => !viewedStoryIds.includes(story._id));
    const nextItem = firstUnviewed || group.items[0];
    if (!nextItem) return;

    openStory(nextItem.story, nextItem.index);
  };

  const toggleLike = async () => {
    if (!activeStory) return;

    try {
      const { data } = await api.post(`/stories/${activeStory._id}/like`);
      setActiveStory((current) => ({
        ...current,
        likes: data.likes,
      }));
    } catch (_error) {
      // Ignore transient failures in the story modal.
    }
  };

  const closeStory = () => {
    setActiveStoryIndex(null);
    setIsViewerListOpen(false);
  };

  const goToPreviousStory = () => {
    setActiveStoryIndex((current) => (current === null ? current : Math.max(current - 1, 0)));
  };

  const goToNextStory = () => {
    setActiveStoryIndex((current) => {
      if (current === null) return current;
      return current < stories.length - 1 ? current + 1 : null;
    });
  };

  const activeStoryHasLike = (activeStory?.likes || []).some(
    (entry) => String(entry?._id || entry) === String(authUser?._id)
  );
  const isOwnStory = String(activeStory?.author?._id) === String(authUser?._id);
  const viewerEntries = (activeStory?.viewers || []).map((entry, index) => ({
    id: String(entry?.user?._id || entry?.user || index),
    username: entry?.user?.username || 'Viewer',
    fullName: entry?.user?.fullName || '',
    profilePicture: entry?.user?.profilePicture?.url,
    viewedAt: entry?.viewedAt,
  }));

  const openProfileFromStory = () => {
    if (!activeStory?.author?.username) return;
    closeStory();
    navigate(`/profile/${activeStory.author.username}`);
  };

  const openViewerList = () => {
    if (!isOwnStory) return;
    setIsViewerListOpen(true);
  };

  return (
    <>
      <section className="ig-surface mb-6 rounded-[24px] border border-black/5 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:shadow-none">
        <div className="scrollbar-hidden flex gap-4 overflow-x-auto">
          {stories.length === 0 ? (
            <div className="px-2 py-5 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
              No active stories yet.
            </div>
          ) : (
            storyGroups.map((group) => {
              const hasUnviewedStory = group.items.some(({ story }) => !viewedStoryIds.includes(story._id));
              const previewStory = group.items.find(({ story }) => !viewedStoryIds.includes(story._id))?.story || group.items[0]?.story;

              return (
              <button
                key={group.id}
                type="button"
                onClick={() => openStoryGroup(group)}
                className="w-[76px] shrink-0 text-center transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div
                  className={`mx-auto w-fit rounded-full p-[2px] ${
                    hasUnviewedStory ? 'story-ring' : 'story-ring-viewed'
                  }`}
                >
                  <img
                    src={previewStory.author?.profilePicture?.url}
                    alt={previewStory.author?.username}
                    className="h-[58px] w-[58px] rounded-full border-2 border-white object-cover dark:border-black"
                  />
                </div>
                <p className="mt-2 truncate text-xs leading-[16px]">{previewStory.author?.username}</p>
              </button>
              );
            })
          )}
        </div>
      </section>

      {activeStory && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%),rgba(0,0,0,0.92)] px-3 py-6 backdrop-blur-sm md:px-6">
          <div className="relative flex w-full max-w-5xl items-center justify-center gap-3 md:gap-6">
            <button
              type="button"
              onClick={goToPreviousStory}
              disabled={activeStoryIndex === 0}
              className="hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
              aria-label="Previous story"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="relative w-full max-w-[420px] overflow-hidden rounded-[34px] border border-white/10 bg-[#0f1720] text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-x-0 top-0 z-10 px-4 pt-4">
                <div className="flex gap-1.5">
                  {stories.map((story, index) => (
                    <span
                      key={story._id}
                      className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
                    >
                      <span
                        className={`block h-full rounded-full ${
                          index < activeStoryIndex ? 'bg-white' : index === activeStoryIndex ? 'bg-white' : 'bg-transparent'
                        }`}
                        style={index === activeStoryIndex ? storyProgressStyle : undefined}
                      />
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={openProfileFromStory}
                    className="flex items-center gap-3 rounded-full bg-black/30 px-3 py-2 text-left backdrop-blur-md transition hover:bg-black/45"
                  >
                    <img
                      src={activeStory.author?.profilePicture?.url}
                      alt={activeStory.author?.username}
                      className="h-10 w-10 rounded-full border border-white/20 object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold leading-tight">{activeStory.author?.username}</p>
                      <p className="text-xs text-white/70">
                        {new Date(activeStory.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={closeStory}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-md backdrop-blur-md transition hover:bg-black/55"
                    aria-label="Close story"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="relative h-[78vh] max-h-[760px] min-h-[560px] bg-[#05070a]">
                <button
                  type="button"
                  onClick={goToPreviousStory}
                  className="absolute inset-y-0 left-0 z-[5] w-1/3"
                  aria-label="Previous story area"
                />
                <button
                  type="button"
                  onClick={goToNextStory}
                  className="absolute inset-y-0 right-0 z-[5] w-1/3"
                  aria-label="Next story area"
                />

                {activeStory.media?.type === 'video' ? (
                  <video
                    src={activeStory.media?.url}
                    className="h-full w-full object-cover"
                    autoPlay
                    controls
                  />
                ) : (
                  <img
                    src={activeStory.media?.url}
                    alt={activeStory.caption}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/72 to-transparent px-4 pb-4 pt-24">
                <div className="rounded-[24px] border border-white/10 bg-black/28 p-4 backdrop-blur-md">
                  <p className="text-sm leading-6 text-white/95">{activeStory.caption || 'Story update'}</p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={toggleLike}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        activeStoryHasLike
                          ? 'border-[#ed4956]/40 bg-[#ed4956]/15 text-[#ff8a97]'
                          : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      <Heart size={16} fill={activeStoryHasLike ? 'currentColor' : 'none'} />
                      <span>{activeStory.likes?.length || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={openViewerList}
                      disabled={!isOwnStory}
                      className={`flex items-center gap-2 text-xs ${
                        isOwnStory
                          ? 'text-white/85 transition hover:text-white'
                          : 'cursor-default text-white/75'
                      }`}
                    >
                      <Eye size={15} />
                      <span>{activeStory.viewers?.length || 0} views</span>
                    </button>
                  </div>

                  {isOwnStory && (
                    <button
                      type="button"
                      onClick={openViewerList}
                      className="mt-3 text-xs text-white/65 transition hover:text-white"
                    >
                      Viewed by {activeStory.viewers?.length || 0} people
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={goToNextStory}
              className="hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg transition hover:bg-white/20 md:flex"
              aria-label="Next story"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {activeStory && isViewerListOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 px-4">
          <div className="ig-surface w-full max-w-md rounded-3xl bg-white p-0 text-black shadow-2xl dark:bg-[#090909] dark:text-white">
            <div className="flex items-center justify-between border-b border-[#dbdbdb] px-5 py-4 dark:border-[#262626]">
              <div>
                <h3 className="text-base font-semibold">Story views</h3>
                <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                  {viewerEntries.length} people viewed this story
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsViewerListOpen(false)}
                className="rounded-full p-2 text-[#8e8e8e] transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
                aria-label="Close viewers list"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-4 py-4">
              {viewerEntries.length === 0 ? (
                <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">No views yet.</p>
              ) : (
                <div className="space-y-3">
                  {viewerEntries.map((viewer) => (
                    <button
                      key={viewer.id}
                      type="button"
                      onClick={() => {
                        setIsViewerListOpen(false);
                        closeStory();
                        if (viewer.username) {
                          navigate(`/profile/${viewer.username}`);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#f5f5f5] dark:hover:bg-[#121212]"
                    >
                      {viewer.profilePicture ? (
                        <img
                          src={viewer.profilePicture}
                          alt={viewer.username}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-sm font-semibold uppercase dark:bg-[#1a1a1a]">
                          {viewer.username.slice(0, 1)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{viewer.username}</p>
                        <p className="truncate text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
                          {viewer.fullName || 'Story viewer'}
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-[#8e8e8e] dark:text-[#a8a8a8]">
                        {viewer.viewedAt
                          ? new Date(viewer.viewedAt).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StoryTray;
