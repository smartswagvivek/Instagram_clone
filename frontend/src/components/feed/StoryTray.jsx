import { Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import api from '../../services/api';

const STORY_DURATION_MS = 5000;

const StoryTray = ({ stories = [] }) => {
  const authUser = useSelector((state) => state.auth.user);
  const [activeStory, setActiveStory] = useState(null);
  const [viewedStoryIds, setViewedStoryIds] = useState([]);
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
    if (!activeStory) return undefined;

    const timer = window.setTimeout(() => setActiveStory(null), STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeStory]);

  const storyProgressStyle = useMemo(
    () => ({ animation: activeStory ? `story-progress ${STORY_DURATION_MS}ms linear forwards` : 'none' }),
    [activeStory]
  );

  const openStory = async (story) => {
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

  return (
    <>
      <section className="ig-surface mb-6 rounded-lg px-4 py-4">
        <div className="scrollbar-hidden flex gap-4 overflow-x-auto">
          {stories.length === 0 ? (
            <div className="px-2 py-5 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">
              No active stories yet.
            </div>
          ) : (
            stories.map((story) => (
              <button
                key={story._id}
                type="button"
                onClick={() => openStory(story)}
                className="w-[72px] shrink-0 text-center"
              >
                <div
                  className={`mx-auto w-fit rounded-full p-[2px] ${
                    viewedStoryIds.includes(story._id) ? 'story-ring-viewed' : 'story-ring'
                  }`}
                >
                  <img
                    src={story.author?.profilePicture?.url}
                    alt={story.author?.username}
                    className="h-[56px] w-[56px] rounded-full border-2 border-white object-cover dark:border-black"
                  />
                </div>
                <div className="mt-2 flex justify-center gap-[2px]">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`h-[2px] w-3 rounded-full ${index === 0 ? 'bg-[#262626]' : 'bg-[#dbdbdb] dark:bg-[#262626]'}`}
                    />
                  ))}
                </div>
                <p className="mt-1 truncate text-xs leading-[16px]">{story.author?.username}</p>
              </button>
            ))
          )}
        </div>
      </section>

      {activeStory && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 px-4">
          <div className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-black text-white">
            <div className="absolute inset-x-0 top-0 z-10 px-4 pt-4">
              <div className="h-1 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full bg-white" style={storyProgressStyle} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={activeStory.author?.profilePicture?.url}
                    alt={activeStory.author?.username}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold">{activeStory.author?.username}</p>
                    <p className="text-xs text-white/70">
                      {new Date(activeStory.createdAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStory(null)}
                  className="text-sm text-white/80"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="h-[70vh]">
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

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-20">
              <p className="text-sm">{activeStory.caption || 'Story update'}</p>
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={toggleLike}
                  className={`inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm ${
                    (activeStory.likes || []).some(
                      (entry) => String(entry?._id || entry) === String(authUser?._id)
                    )
                      ? 'text-[#ed4956]'
                      : 'text-white'
                  }`}
                >
                  <Heart
                    size={16}
                    fill={
                      (activeStory.likes || []).some(
                        (entry) => String(entry?._id || entry) === String(authUser?._id)
                      )
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  <span>{activeStory.likes?.length || 0}</span>
                </button>
              </div>
              {String(activeStory.author?._id) === String(authUser?._id) && (
                <p className="mt-2 text-xs text-white/70">
                  Viewed by {activeStory.viewers?.length || 0} people
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StoryTray;
