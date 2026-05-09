import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CreatePostPage from './pages/CreatePostPage';
import ExplorePage from './pages/ExplorePage';
import FeedPage from './pages/FeedPage';
import DiscoveryPage from './pages/DiscoveryPage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import ReelsPage from './pages/ReelsPage';
import SavedPage from './pages/SavedPage';
import SettingsPage from './pages/SettingsPage';
import SignupPage from './pages/SignupPage';
import { loadCurrentUser } from './redux/slices/authSlice';
import {
  appendIncomingMessage,
  fetchConversation,
  fetchConversations,
  mergeMessageUpdate,
  recordIncomingMessagePreview,
} from './redux/slices/messagesSlice';
import { fetchUnreadCount, pushNotification } from './redux/slices/notificationSlice';
import { showToast } from './redux/slices/uiSlice';
import { selectTheme } from './redux/slices/uiSlice';
import { connectSocket, getSocket } from './services/socket';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';

const GuestOnly = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/feed" replace /> : <Outlet />;
};

const getEntityId = (value) => String(value?._id || value?.id || value || '');

const App = () => {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const token = useSelector((state) => state.auth.accessToken);
  const activeMessageUserId = useSelector((state) => state.messages.activeUserId);

  useEffect(() => {
    if (token) {
      connectSocket(token);
      dispatch(loadCurrentUser());
      dispatch(fetchUnreadCount());
      dispatch(fetchConversations());
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = getSocket() || connectSocket(token);
    if (!socket) return undefined;

    const refreshBadges = () => {
      dispatch(fetchUnreadCount());
      dispatch(fetchConversations());
    };

    const onNotification = (payload) => {
      dispatch(pushNotification(payload));
      dispatch(fetchUnreadCount());
      dispatch(
        showToast({
          tone: 'success',
          message: payload?.title || payload?.body || 'New activity on your account.',
        })
      );
    };

    const onMessage = (message) => {
      const senderId = getEntityId(message?.sender);
      const isViewingSenderChat =
        senderId &&
        getEntityId(activeMessageUserId) === senderId &&
        window.location.pathname.startsWith('/messages');

      dispatch(appendIncomingMessage(message));

      if (isViewingSenderChat) {
        dispatch(fetchConversation(senderId)).then(() => dispatch(fetchConversations()));
      } else {
        dispatch(recordIncomingMessagePreview(message));
        dispatch(fetchConversations());
      }

      dispatch(fetchUnreadCount());
    };

    const onMessageUpdated = (message) => {
      dispatch(mergeMessageUpdate(message));
      dispatch(fetchConversations());
    };

    const onSocketReady = () => refreshBadges();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshBadges();
      }
    };

    const onWindowFocus = () => refreshBadges();

    socket.on('notification:new', onNotification);
    socket.on('message:new', onMessage);
    socket.on('message:updated', onMessageUpdated);
    socket.on('connect', onSocketReady);
    socket.io.on('reconnect', onSocketReady);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    const refreshInterval = window.setInterval(refreshBadges, 15000);

    return () => {
      socket.off('notification:new', onNotification);
      socket.off('message:new', onMessage);
      socket.off('message:updated', onMessageUpdated);
      socket.off('connect', onSocketReady);
      socket.io.off('reconnect', onSocketReady);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.clearInterval(refreshInterval);
    };
  }, [activeMessageUserId, dispatch, token]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider />
        <Routes>
          <Route element={<GuestOnly />}>
            <Route index element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/search" element={<ExplorePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/hashtag/:tag" element={<DiscoveryPage mode="hashtag" />} />
            <Route path="/explore/location/:location" element={<DiscoveryPage mode="location" />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/create" element={<CreatePostPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/post/:postId" element={<PostPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:identifier" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to={token ? '/feed' : '/'} replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
