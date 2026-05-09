import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import api from '../../services/api';

const initialState = {
  conversations: [],
  activeUserId: null,
  messagesByUser: {},
  typingByUser: {},
  loading: false,
  error: null,
};

export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (query = '', { rejectWithValue }) => {
    try {
      const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
      const { data } = await api.get(`/messages/conversations${suffix}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load conversations');
    }
  }
);

export const fetchConversation = createAsyncThunk(
  'messages/fetchConversation',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/messages/conversation/${userId}`);
      return { userId, messages: data.messages || [] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load conversation');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ recipientId, text, replyToId, sharedPostId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/messages/send', { recipientId, text, replyToId, sharedPostId });
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const editMessage = createAsyncThunk(
  'messages/editMessage',
  async ({ messageId, text, userId }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/messages/${messageId}`, { text });
      return { userId, message: data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to edit message');
    }
  }
);

export const reactToMessage = createAsyncThunk(
  'messages/reactToMessage',
  async ({ messageId, emoji, userId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/messages/${messageId}/reaction`, { emoji });
      return { userId, message: data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to react to message');
    }
  }
);

export const unsendMessage = createAsyncThunk(
  'messages/unsendMessage',
  async ({ messageId, userId }, { rejectWithValue }) => {
    try {
      await api.delete(`/messages/${messageId}`);
      return { messageId, userId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unsend message');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    resetMessagesState() {
      return initialState;
    },
    setActiveUser(state, action) {
      state.activeUserId = action.payload;
    },
    setTypingState(state, action) {
      state.typingByUser[action.payload.userId] = action.payload.value;
    },
    appendIncomingMessage(state, action) {
      const otherUserId =
        action.payload.sender._id === state.activeUserId
          ? action.payload.sender._id
          : action.payload.recipient._id;
      state.messagesByUser[otherUserId] = [
        ...(state.messagesByUser[otherUserId] || []),
        action.payload,
      ];
    },
    mergeMessageUpdate(state, action) {
      Object.keys(state.messagesByUser).forEach((userId) => {
        state.messagesByUser[userId] = state.messagesByUser[userId].map((message) =>
          message._id === action.payload._id ? action.payload : message
        );
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = action.payload.messages;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const otherUserId = action.payload.recipient._id;
        state.messagesByUser[otherUserId] = [
          ...(state.messagesByUser[otherUserId] || []),
          action.payload,
        ];
      })
      .addCase(editMessage.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = (state.messagesByUser[action.payload.userId] || []).map(
          (message) => (message._id === action.payload.message._id ? action.payload.message : message)
        );
      })
      .addCase(reactToMessage.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = (state.messagesByUser[action.payload.userId] || []).map(
          (message) => (message._id === action.payload.message._id ? action.payload.message : message)
        );
      })
      .addCase(unsendMessage.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = (state.messagesByUser[action.payload.userId] || []).map(
          (message) =>
            message._id === action.payload.messageId
              ? { ...message, text: '', media: [], reactions: [], isUnsent: true, isDeleted: true }
              : message
        );
      })
      .addMatcher(
        (action) => action.type.startsWith('messages/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export const { appendIncomingMessage, mergeMessageUpdate, resetMessagesState, setActiveUser, setTypingState } =
  messagesSlice.actions;
export default messagesSlice.reducer;
