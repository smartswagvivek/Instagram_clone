import axios from 'axios';

const normalizeUrl = (url = '') => url.trim().replace(/\/+$/, '');
const ensureApiBaseUrl = (url) => {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return '/api';
  }

  return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
};

const API_URL = import.meta.env.DEV ? '/api' : ensureApiBaseUrl(import.meta.env.VITE_API_URL);
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/signup',
  '/auth/register',
  '/auth/check-availability',
  '/auth/refresh-token',
];

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const accessToken = window.localStorage.getItem('accessToken');
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) => config.url?.includes(endpoint));

  if (accessToken && !isPublic) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !PUBLIC_ENDPOINTS.some((endpoint) => originalRequest.url?.includes(endpoint))
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = window.localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('Refresh token missing');

        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });

        window.localStorage.setItem('accessToken', data.accessToken);
        window.localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
