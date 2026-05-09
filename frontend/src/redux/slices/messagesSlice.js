import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import api from '../../services/api';

const initialState = {
  conversations: [],
  activeUserId: null,
  messagesByUser: {},
  typingByUser: {},
  unreadCount: 0,
  loading: false,
  error: null,
};

const getUnreadTotal = (conversations = []) =>
  conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);

const getEntityId = (value) => String(value?._id || value?.id || value || '');

const addMessageOnce = (messages = [], nextMessage) => {
  if (!nextMessage?._id) return messages;
  if (messages.some((message) => message._id === nextMessage._id)) return messages;
  return [...messages, nextMessage];
};

const moveConversationToTop = (state, userId, message, fallbackUser, unreadCount) => {
  if (!userId || !message?._id) return;

  const existingConversation = state.conversations.find(
    (conversation) => getEntityId(conversation.user) === userId
  );

  if (existingConversation) {
    existingConversation.lastMessage = message;
    if (typeof unreadCount === 'number') {
      existingConversation.unreadCount = unreadCount;
    }
    state.conversations = [
      existingConversation,
      ...state.conversations.filter((conversation) => getEntityId(conversation.user) !== userId),
    ];
    return;
  }

  if (fallbackUser && typeof fallbackUser === 'object') {
    state.conversations = [
      {
        user: fallbackUser,
        lastMessage: message,
        unreadCount: unreadCount || 0,
        pinned: false,
      },
      ...state.conversations,
    ];
  }
};

const updateConversationMessage = (state, message) => {
  state.conversations = state.conversations.map((conversation) =>
    conversation.lastMessage?._id === message._id
      ? { ...conversation, lastMessage: message }
      : conversation
  );
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
      const { data } = await api.get(`/messages/conversation/${userId}?limit=all`);
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
      const senderId = getEntityId(action.payload.sender);
      const otherUserId = senderId;
      if (!otherUserId) return;

      state.messagesByUser[otherUserId] = addMessageOnce(
        state.messagesByUser[otherUserId],
        action.payload
      );
    },
    recordIncomingMessagePreview(state, action) {
      const senderId = getEntityId(action.payload.sender);
      if (!senderId) return;

      const existingConversation = state.conversations.find(
        (conversation) => getEntityId(conversation.user) === senderId
      );
      const isSameLastMessage = existingConversation?.lastMessage?._id === action.payload._id;
      const unreadCount = isSameLastMessage
        ? existingConversation?.unreadCount || 0
        : (existingConversation?.unreadCount || 0) + 1;

      moveConversationToTop(state, senderId, action.payload, action.payload.sender, unreadCount);

      state.unreadCount = getUnreadTotal(state.conversations);
    },
    mergeMessageUpdate(state, action) {
      Object.keys(state.messagesByUser).forEach((userId) => {
        state.messagesByUser[userId] = state.messagesByUser[userId].map((message) =>
          message._id === action.payload._id ? action.payload : message
        );
      });
      updateConversationMessage(state, action.payload);
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
        state.unreadCount = getUnreadTotal(action.payload);
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = action.payload.messages;
        state.conversations = state.conversations.map((conversation) =>
          getEntityId(conversation.user) === getEntityId(action.payload.userId)
            ? { ...conversation, unreadCount: 0 }
            : conversation
        );
        state.unreadCount = getUnreadTotal(state.conversations);
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const otherUserId = getEntityId(action.payload.recipient);
        if (!otherUserId) return;

        state.messagesByUser[otherUserId] = addMessageOnce(
          state.messagesByUser[otherUserId],
          action.payload
        );
        moveConversationToTop(state, otherUserId, action.payload, action.payload.recipient, 0);
        state.unreadCount = getUnreadTotal(state.conversations);
      })
      .addCase(editMessage.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = (state.messagesByUser[action.payload.userId] || []).map(
          (message) => (message._id === action.payload.message._id ? action.payload.message : message)
        );
        updateConversationMessage(state, action.payload.message);
      })
      .addCase(reactToMessage.fulfilled, (state, action) => {
        state.messagesByUser[action.payload.userId] = (state.messagesByUser[action.payload.userId] || []).map(
          (message) => (message._id === action.payload.message._id ? action.payload.message : message)
        );
        updateConversationMessage(state, action.payload.message);
      })
      .addCase(unsendMessage.fulfilled, (state, action) => {
        let updatedMessage = null;
        state.messagesByUser[action.payload.userId] = (state.messagesByUser[action.payload.userId] || []).map(
          (message) => {
            if (message._id !== action.payload.messageId) return message;
            updatedMessage = { ...message, text: '', media: [], reactions: [], isUnsent: true, isDeleted: true };
            return updatedMessage;
          }
        );
        if (updatedMessage) {
          updateConversationMessage(state, updatedMessage);
        }
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

export const {
  appendIncomingMessage,
  mergeMessageUpdate,
  recordIncomingMessagePreview,
  resetMessagesState,
  setActiveUser,
  setTypingState,
} = messagesSlice.actions;
export default messagesSlice.reducer;
