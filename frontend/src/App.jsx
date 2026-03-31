import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import CreatePostPage from './pages/CreatePostPage';
import ExplorePage from './pages/ExplorePage';
import FeedPage from './pages/FeedPage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import ReelsPage from './pages/ReelsPage';
import SavedPage from './pages/SavedPage';
import SignupPage from './pages/SignupPage';
import { loadCurrentUser } from './redux/slices/authSlice';
import { pushNotification } from './redux/slices/notificationSlice';
import { showToast } from './redux/slices/uiSlice';
import { selectTheme } from './redux/slices/uiSlice';
import { connectSocket, getSocket } from './services/socket';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';

const GuestOnly = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/feed" replace /> : <Outlet />;
};

const App = () => {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const token = useSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (token) {
      connectSocket(token);
      dispatch(loadCurrentUser());
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = getSocket() || connectSocket(token);
    if (!socket) return undefined;

    const handlers = ['like', 'comment', 'follow', 'follow_request'].map(
      (eventName) => {
        const handler = (payload) => {
          dispatch(pushNotification(payload));
          dispatch(
            showToast({
              tone: 'success',
              message: payload?.title || payload?.body || 'New activity on your account.',
            })
          );
        };

        socket.on(eventName, handler);
        return { eventName, handler };
      }
    );

    return () => {
      handlers.forEach(({ eventName, handler }) => socket.off(eventName, handler));
    };
  }, [dispatch, token]);

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
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/create" element={<CreatePostPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/saved" element={<SavedPage />} />
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
