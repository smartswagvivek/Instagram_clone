import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationSlice';
import postsReducer from './slices/postsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    messages: messagesReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
  },
});
