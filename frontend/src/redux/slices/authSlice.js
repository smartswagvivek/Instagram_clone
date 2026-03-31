import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import api from '../../services/api';
import { disconnectSocket, connectSocket } from '../../services/socket';

const getStoredToken = (key) => window.localStorage.getItem(key);

const initialState = {
  user: null,
  accessToken: getStoredToken('accessToken'),
  refreshToken: getStoredToken('refreshToken'),
  isAuthenticated: Boolean(getStoredToken('accessToken')),
  loading: false,
  error: null,
};

const persistTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) window.localStorage.setItem('accessToken', accessToken);
  if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
};

const clearTokens = () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
};

const formatApiError = (error, fallbackMessage) => {
  const payload = error.response?.data;

  if (payload?.details?.length) {
    return payload.details[0]?.msg || payload.details[0]?.message || fallbackMessage;
  }

  if (payload?.message) {
    return payload.message;
  }

  if (!error.response) {
    return 'Unable to reach the server. Make sure both the frontend and backend are running.';
  }

  return fallbackMessage;
};

export const signup = createAsyncThunk('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/signup', payload);
    persistTokens(data);
    connectSocket(data.accessToken);
    return data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, 'Signup failed'));
  }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    persistTokens(data);
    connectSocket(data.accessToken);
    return data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, 'Login failed'));
  }
});

export const loadCurrentUser = createAsyncThunk(
  'auth/loadCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch (error) {
      return rejectWithValue(formatApiError(error, 'Unable to load user'));
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const refreshToken = getState().auth.refreshToken;
      await api.post('/auth/logout', { refreshToken });
      disconnectSocket();
      clearTokens();
      return true;
    } catch (error) {
      disconnectSocket();
      clearTokens();
      return rejectWithValue(formatApiError(error, 'Logout failed'));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticatedUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loadCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        clearTokens();
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setAuthenticatedUser } = authSlice.actions;
export default authSlice.reducer;
