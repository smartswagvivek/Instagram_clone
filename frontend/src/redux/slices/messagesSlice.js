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
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/messages/conversations');
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
  async ({ recipientId, text }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/messages/send', { recipientId, text });
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
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
      .addMatcher(
        (action) => action.type.startsWith('messages/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export const { appendIncomingMessage, setActiveUser, setTypingState } = messagesSlice.actions;
export default messagesSlice.reducer;
