import jwt from 'jsonwebtoken';

import User from '../models/User.js';

const connectedUsers = new Map();
const activeCalls = new Map();

const addConnectedSocket = (userId, socketId) => {
  const sockets = connectedUsers.get(userId) || new Set();
  sockets.add(socketId);
  connectedUsers.set(userId, sockets);
};

const removeConnectedSocket = (userId, socketId) => {
  const sockets = connectedUsers.get(userId);
  if (!sockets) return false;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    connectedUsers.delete(userId);
    return false;
  }

  return true;
};

const setupSocketIO = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.userId = String(user._id);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', async (socket) => {
    addConnectedSocket(socket.userId, socket.id);
    socket.join(socket.userId);
    await User.findByIdAndUpdate(socket.userId, { status: 'online' });
    io.emit('presence:update', { userId: socket.userId, status: 'online' });

    socket.on('chat:typing', ({ recipientId }) => {
      io.to(String(recipientId)).emit('chat:typing', {
        fromUserId: socket.userId,
      });
    });

    socket.on('chat:stop-typing', ({ recipientId }) => {
      io.to(String(recipientId)).emit('chat:stop-typing', {
        fromUserId: socket.userId,
      });
    });

    socket.on('call:invite', ({ recipientId, callId, callType }) => {
      const targetUserId = String(recipientId);

      if (!connectedUsers.has(targetUserId)) {
        socket.emit('call:unavailable', {
          callId,
          recipientId: targetUserId,
        });
        return;
      }

      io.to(targetUserId).emit('call:incoming', {
        callId,
        callType,
        fromUser: {
          _id: socket.userId,
          username: socket.user.username,
          fullName: socket.user.fullName,
          profilePicture: socket.user.profilePicture,
        },
      });

      activeCalls.set(callId, {
        callerId: socket.userId,
        recipientId: targetUserId,
        status: 'ringing',
      });
    });

    socket.on('call:accept', ({ recipientId, callId }) => {
      activeCalls.set(callId, {
        callerId: String(recipientId),
        recipientId: socket.userId,
        status: 'accepted',
      });

      io.to(String(recipientId)).emit('call:accepted', {
        callId,
        fromUserId: socket.userId,
      });
    });

    socket.on('call:decline', ({ recipientId, callId }) => {
      const activeCall = activeCalls.get(callId);
      if (activeCall?.status === 'accepted') {
        return;
      }

      activeCalls.delete(callId);
      io.to(String(recipientId)).emit('call:declined', {
        callId,
        fromUserId: socket.userId,
      });
    });

    socket.on('call:end', ({ recipientId, callId }) => {
      activeCalls.delete(callId);
      io.to(String(recipientId)).emit('call:ended', {
        callId,
        fromUserId: socket.userId,
      });
    });

    socket.on('call:signal', ({ recipientId, callId, signal }) => {
      io.to(String(recipientId)).emit('call:signal', {
        callId,
        signal,
        fromUserId: socket.userId,
      });
    });

    socket.on('disconnect', async () => {
      const stillConnected = removeConnectedSocket(socket.userId, socket.id);
      if (stillConnected) return;

      await User.findByIdAndUpdate(socket.userId, { status: 'offline' });
      io.emit('presence:update', { userId: socket.userId, status: 'offline' });
    });
  });
};

export default setupSocketIO;
