import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => window.localStorage.getItem('theme') || 'light';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: getInitialTheme(),
    feedMode: 'algorithmic',
    toast: null,
    createMenuOpen: false,
  },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('theme', state.theme);
    },
    setFeedMode(state, action) {
      state.feedMode = action.payload;
    },
    showToast(state, action) {
      state.toast = {
        id: Date.now(),
        tone: action.payload?.tone || 'default',
        message: action.payload?.message || '',
      };
    },
    clearToast(state) {
      state.toast = null;
    },
    openCreateMenu(state) {
      state.createMenuOpen = true;
    },
    closeCreateMenu(state) {
      state.createMenuOpen = false;
    },
  },
});

export const selectTheme = (state) => state.ui.theme;
export const { clearToast, closeCreateMenu, openCreateMenu, setFeedMode, showToast, toggleTheme } =
  uiSlice.actions;
export default uiSlice.reducer;
