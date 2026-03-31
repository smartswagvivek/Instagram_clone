import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { loadCurrentUser } from '../redux/slices/authSlice';
import { fetchNotifications, markAllRead } from '../redux/slices/notificationSlice';
import { acceptFollowRequest, rejectFollowRequest } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/uiSlice';

const NotificationsPage = () => {
  const dispatch = useDispatch();
  const { items, unreadCount } = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleRequestDecision = async (userId, action) => {
    const result = await dispatch(
      action === 'accept' ? acceptFollowRequest(userId) : rejectFollowRequest(userId)
    );

    if (result.error) {
      dispatch(showToast({ tone: 'error', message: result.payload || 'Unable to update request.' }));
      return;
    }

    dispatch(loadCurrentUser());
    dispatch(fetchNotifications());
    dispatch(
      showToast({
        tone: 'success',
        message: action === 'accept' ? 'Follow request accepted.' : 'Follow request rejected.',
      })
    );
  };

  return (
    <div className="mx-auto max-w-[630px] px-4 py-8 md:px-0">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <button
          type="button"
          onClick={() => dispatch(markAllRead())}
          className="text-sm font-semibold text-[#0095f6]"
        >
          Mark all read
        </button>
      </div>

      <div className="ig-surface rounded-lg">
        <div className="border-b border-[#dbdbdb] px-4 py-3 text-sm text-[#8e8e8e] dark:border-[#262626] dark:text-[#a8a8a8]">
          {unreadCount} unread
        </div>
        <div>
          {items.map((notification) => (
            <div
              key={notification._id}
              className="flex items-start gap-3 border-b border-[#efefef] px-4 py-4 last:border-b-0 dark:border-[#1a1a1a]"
            >
              <img
                src={notification.actor?.profilePicture?.url}
                alt={notification.actor?.username}
                className="h-11 w-11 rounded-full object-cover"
              />
              <div className="flex-1 text-sm leading-[18px]">
                <p>
                  <span className="font-semibold">{notification.actor?.username}</span>{' '}
                  {notification.body || notification.title}
                </p>
                <p className="mt-1 text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
                {notification.type === 'follow_request' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRequestDecision(notification.actor?._id, 'accept')}
                      className="ig-button-primary"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestDecision(notification.actor?._id, 'reject')}
                      className="rounded-lg bg-[#efefef] px-3 py-2 text-sm font-semibold dark:bg-[#262626]"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              {notification.post?.media?.[0]?.url && (
                <img
                  src={notification.post.media[0].url}
                  alt="Post preview"
                  className="h-11 w-11 object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
