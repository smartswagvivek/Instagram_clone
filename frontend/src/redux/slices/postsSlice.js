import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import api from '../../services/api';

const initialState = {
  feed: [],
  feedPage: 1,
  feedHasMore: true,
  explore: [],
  explorePage: 1,
  exploreHasMore: true,
  reels: [],
  stories: [],
  profile: {
    user: null,
    posts: [],
    canViewPosts: true,
    isFollowing: false,
    hasPendingRequest: false,
  },
  saved: {
    savedPosts: [],
    collections: [],
  },
  commentsByPost: {},
  userSearchResults: [],
  loading: false,
  createStatus: 'idle',
  profileStatus: 'idle',
  error: null,
};

const withUniqueUserRef = (items = [], userId) => {
  if (items.some((entry) => String(entry?._id || entry) === String(userId))) {
    return items;
  }

  return [...items, userId];
};

const withoutUserRef = (items = [], userId) =>
  items.filter((entry) => String(entry?._id || entry) !== String(userId));

const updatePostCollections = (state, postId, updater) => {
  const apply = (items = []) => items.map((post) => (post._id === postId ? updater(post) : post));

  state.feed = apply(state.feed);
  state.explore = apply(state.explore);
  state.reels = apply(state.reels);
  state.profile.posts = apply(state.profile.posts);
  state.saved.savedPosts = apply(state.saved.savedPosts);
  state.saved.collections = state.saved.collections.map((collection) => ({
    ...collection,
    posts: apply(collection.posts || []),
  }));
};

const removePostCollections = (state, postId) => {
  const filterItems = (items = []) => items.filter((post) => post._id !== postId);

  state.feed = filterItems(state.feed);
  state.explore = filterItems(state.explore);
  state.reels = filterItems(state.reels);
  state.profile.posts = filterItems(state.profile.posts);
  state.saved.savedPosts = filterItems(state.saved.savedPosts);
  state.saved.collections = state.saved.collections.map((collection) => ({
    ...collection,
    posts: filterItems(collection.posts || []),
  }));
  delete state.commentsByPost[postId];
};

export const fetchFeedPosts = createAsyncThunk(
  'posts/fetchFeedPosts',
  async ({ page = 1, mode = 'algorithmic' }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${page}&limit=10&mode=${mode}`);
      return { ...data, page };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load feed');
    }
  }
);

export const fetchExplorePosts = createAsyncThunk(
  'posts/fetchExplorePosts',
  async ({ page = 1, q = '' }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({ page, limit: 15 });
      if (q) query.set('q', q);
      const { data } = await api.get(`/posts/explore?${query.toString()}`);
      return { ...data, page };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load explore');
    }
  }
);

export const fetchReels = createAsyncThunk('posts/fetchReels', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/posts/reels?page=1&limit=6');
    return data.posts;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load reels');
  }
});

export const fetchStories = createAsyncThunk(
  'posts/fetchStories',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/stories');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load stories');
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'posts/fetchProfile',
  async ({ identifier }, { rejectWithValue }) => {
    try {
      const endpoint =
        /^[a-f0-9]{24}$/i.test(identifier) || !identifier
          ? `/users/${identifier}`
          : `/users/username/${identifier}`;
      const { data } = await api.get(endpoint);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load profile');
    }
  }
);

export const fetchSavedPosts = createAsyncThunk(
  'posts/fetchSavedPosts',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/users/saved');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load saved posts');
    }
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.post;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create post');
    }
  }
);

export const createStory = createAsyncThunk(
  'posts/createStory',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/stories/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.story;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create story');
    }
  }
);

export const likePost = createAsyncThunk(
  'posts/likePost',
  async ({ postId, liked }, { getState, rejectWithValue }) => {
    try {
      await api.post(`/posts/${postId}/${liked ? 'unlike' : 'like'}`);
      return { postId, liked: !liked, userId: getState().auth.user?._id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update like');
    }
  }
);

export const savePost = createAsyncThunk(
  'posts/savePost',
  async ({ postId, saved }, { getState, rejectWithValue }) => {
    try {
      await api.post(`/posts/${postId}/${saved ? 'unsave' : 'save'}`);
      return { postId, saved: !saved, userId: getState().auth.user?._id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update save');
    }
  }
);

export const fetchComments = createAsyncThunk(
  'posts/fetchComments',
  async (postId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/comments/${postId}`);
      return { postId, comments: data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load comments');
    }
  }
);

export const addComment = createAsyncThunk(
  'posts/addComment',
  async ({ postId, text, parentCommentId = null }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${postId}/comment`, { text, parentCommentId });
      return { postId, comment: data.comment };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

export const deleteComment = createAsyncThunk(
  'posts/deleteComment',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/comments/${commentId}`);
      return { postId, commentId, deletedCount: data.deletedCount || 1 };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete comment');
    }
  }
);

export const toggleCommentLike = createAsyncThunk(
  'posts/toggleCommentLike',
  async ({ postId, commentId, liked }, { getState, rejectWithValue }) => {
    try {
      const endpoint = `/comments/${commentId}/${liked ? 'unlike' : 'like'}`;
      const { data } = await api.post(endpoint);
      return {
        postId,
        commentId,
        liked: !liked,
        likesCount: data.likesCount,
        userId: getState().auth.user?._id,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update comment like');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'posts/searchUsers',
  async (query, { rejectWithValue }) => {
    try {
      if (!query.trim()) return [];
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search users');
    }
  }
);

export const followUser = createAsyncThunk(
  'posts/followUser',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/users/follow/${userId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to follow user');
    }
  }
);

export const unfollowUser = createAsyncThunk(
  'posts/unfollowUser',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/users/unfollow/${userId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unfollow user');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'posts/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/users/profile', payload);
      return data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const uploadProfilePicture = createAsyncThunk(
  'posts/uploadProfilePicture',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const { data } = await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile picture');
    }
  }
);

export const removeProfilePhoto = createAsyncThunk(
  'posts/removeProfilePhoto',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/users/remove-profile-pic');
      return data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove profile photo');
    }
  }
);

export const fetchFollowRequests = createAsyncThunk(
  'posts/fetchFollowRequests',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/users/follow-requests');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load follow requests');
    }
  }
);

export const acceptFollowRequest = createAsyncThunk(
  'posts/acceptFollowRequest',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/users/follow-requests/${userId}/accept`);
      return data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept follow request');
    }
  }
);

export const rejectFollowRequest = createAsyncThunk(
  'posts/rejectFollowRequest',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/users/follow-requests/${userId}/reject`);
      return data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject follow request');
    }
  }
);

export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId, { rejectWithValue }) => {
    try {
      await api.delete(`/posts/${postId}`);
      return postId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete post');
    }
  }
);

export const sharePost = createAsyncThunk(
  'posts/sharePost',
  async (postId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${postId}/share`);
      return { postId, ...data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to share post');
    }
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    resetFeed(state) {
      state.feed = [];
      state.feedPage = 1;
      state.feedHasMore = true;
    },
    resetExplore(state) {
      state.explore = [];
      state.explorePage = 1;
      state.exploreHasMore = true;
      state.userSearchResults = [];
    },
    clearComments(state, action) {
      delete state.commentsByPost[action.payload];
    },
  },
  extraReducers: (builder) => {
    const updateCommentTree = (comments = [], commentId, updater) =>
      comments.map((comment) => {
        if (comment._id === commentId) {
          return updater(comment);
        }

        return {
          ...comment,
          replies: updateCommentTree(comment.replies || [], commentId, updater),
        };
      });

    builder
      .addCase(fetchFeedPosts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.feed =
          action.payload.page === 1
            ? action.payload.posts
            : [...state.feed, ...action.payload.posts];
        state.feedPage = action.payload.page;
        state.feedHasMore = action.payload.hasMore;
      })
      .addCase(fetchExplorePosts.fulfilled, (state, action) => {
        state.explore =
          action.payload.page === 1
            ? action.payload.posts
            : [...state.explore, ...action.payload.posts];
        state.explorePage = action.payload.page;
        state.exploreHasMore = action.payload.hasMore;
      })
      .addCase(fetchReels.fulfilled, (state, action) => {
        state.reels = action.payload;
      })
      .addCase(fetchStories.fulfilled, (state, action) => {
        state.stories = action.payload;
      })
      .addCase(fetchProfile.pending, (state) => {
        state.profileStatus = 'loading';
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profileStatus = 'succeeded';
        state.profile = {
          ...state.profile,
          ...action.payload,
        };
      })
      .addCase(fetchSavedPosts.fulfilled, (state, action) => {
        state.saved = action.payload;
      })
      .addCase(createPost.pending, (state) => {
        state.createStatus = 'loading';
      })
      .addCase(createStory.pending, (state) => {
        state.createStatus = 'loading';
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.feed = [action.payload, ...state.feed];
      })
      .addCase(createStory.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.stories = [action.payload, ...state.stories];
      })
      .addCase(createPost.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })
      .addCase(likePost.fulfilled, (state, action) => {
        updatePostCollections(state, action.payload.postId, (post) => ({
          ...post,
          likes: action.payload.liked
            ? withUniqueUserRef(post.likes, action.payload.userId)
            : withoutUserRef(post.likes, action.payload.userId),
        }));
      })
      .addCase(savePost.fulfilled, (state, action) => {
        updatePostCollections(state, action.payload.postId, (post) => ({
          ...post,
          saves: action.payload.saved
            ? withUniqueUserRef(post.saves, action.payload.userId)
            : withoutUserRef(post.saves, action.payload.userId),
        }));
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.commentsByPost[action.payload.postId] = action.payload.comments;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        if (action.payload.comment.parentComment) {
          state.commentsByPost[action.payload.postId] = updateCommentTree(
            state.commentsByPost[action.payload.postId] || [],
            action.payload.comment.parentComment,
            (comment) => ({
              ...comment,
              replies: [...(comment.replies || []), { ...action.payload.comment, replies: [] }],
            })
          );
        } else {
          state.commentsByPost[action.payload.postId] = [
            { ...action.payload.comment, replies: [] },
            ...(state.commentsByPost[action.payload.postId] || []),
          ];
        }
        updatePostCollections(state, action.payload.postId, (post) => ({
          ...post,
          stats: {
            ...(post.stats || {}),
            commentsCount: (post.stats?.commentsCount || 0) + 1,
          },
        }));
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const removeCommentTree = (comments = []) =>
          comments
            .filter((comment) => comment._id !== action.payload.commentId)
            .map((comment) => ({
              ...comment,
              replies: removeCommentTree(comment.replies || []),
            }));

        state.commentsByPost[action.payload.postId] = removeCommentTree(
          state.commentsByPost[action.payload.postId] || []
        );
        updatePostCollections(state, action.payload.postId, (post) => ({
          ...post,
          stats: {
            ...(post.stats || {}),
            commentsCount: Math.max(
              (post.stats?.commentsCount || 0) - (action.payload.deletedCount || 1),
              0
            ),
          },
        }));
      })
      .addCase(toggleCommentLike.fulfilled, (state, action) => {
        state.commentsByPost[action.payload.postId] = updateCommentTree(
          state.commentsByPost[action.payload.postId] || [],
          action.payload.commentId,
          (comment) => ({
            ...comment,
            likes: action.payload.liked
              ? withUniqueUserRef(comment.likes, action.payload.userId)
              : withoutUserRef(comment.likes, action.payload.userId),
          })
        );
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.userSearchResults = action.payload;
      })
      .addCase(followUser.fulfilled, (state, action) => {
        if (state.profile.user?._id === action.payload.user?._id) {
          state.profile.user = action.payload.user;
          state.profile.isFollowing = action.payload.status === 'following';
          state.profile.hasPendingRequest = action.payload.status === 'requested';
        }
        state.userSearchResults = state.userSearchResults.map((user) =>
          user._id === action.payload.user?._id ? { ...user, ...action.payload.user } : user
        );
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        if (state.profile.user?._id === action.payload.user?._id) {
          state.profile.user = action.payload.user;
          state.profile.isFollowing = false;
          state.profile.hasPendingRequest = false;
        }
        state.userSearchResults = state.userSearchResults.map((user) =>
          user._id === action.payload.user?._id ? { ...user, ...action.payload.user } : user
        );
      })
      .addCase(updateProfile.pending, (state) => {
        state.profileStatus = 'loading';
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profileStatus = 'succeeded';
        state.profile.user = action.payload;
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.profile.user = action.payload;
      })
      .addCase(removeProfilePhoto.fulfilled, (state, action) => {
        state.profile.user = action.payload;
      })
      .addCase(fetchFollowRequests.fulfilled, (state, action) => {
        if (state.profile.user) {
          state.profile.user.followRequestsReceived = action.payload;
        }
      })
      .addCase(acceptFollowRequest.fulfilled, (state, action) => {
        state.profile.user = action.payload;
      })
      .addCase(rejectFollowRequest.fulfilled, (state, action) => {
        state.profile.user = action.payload;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        removePostCollections(state, action.payload);
      })
      .addCase(sharePost.fulfilled, (state, action) => {
        updatePostCollections(state, action.payload.postId, (post) => ({
          ...post,
          stats: {
            ...(post.stats || {}),
            sharesCount: (post.stats?.sharesCount || 0) + 1,
          },
        }));
      })
      .addMatcher(
        (action) => action.type.startsWith('posts/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.profileStatus = 'failed';
          state.error = action.payload;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('posts/') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.loading = false;
          state.error = null;
        }
      );
  },
});

export const { clearComments, resetExplore, resetFeed } = postsSlice.actions;
export default postsSlice.reducer;
