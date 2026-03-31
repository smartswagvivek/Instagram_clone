import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import api from '../../services/api';

const initialState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/notifications?page=1&limit=25');
      return data.notifications;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      return data.unreadCount;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load unread count');
    }
  }
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.put('/notifications/mark-all-read');
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update notifications');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    pushNotification(state, action) {
      state.items = [action.payload, ...state.items];
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.unreadCount = 0;
        state.items = state.items.map((item) => ({ ...item, isRead: true }));
      });
  },
});

export const { pushNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
