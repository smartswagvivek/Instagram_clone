import { io } from 'socket.io-client';

let socket;
let socketToken;

const normalizeUrl = (url = '') => url.trim().replace(/\/+$/, '');
const getSocketUrl = () => {
  const configuredUrl =
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const normalizedUrl = normalizeUrl(configuredUrl);

  return normalizedUrl.endsWith('/api') ? normalizedUrl.slice(0, -4) : normalizedUrl;
};

export const connectSocket = (token) => {
  if (!token) return null;
  if (socket && socketToken !== token) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }

  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socketToken = token;
  socket = io(getSocketUrl(), {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
};
