import jwt from 'jsonwebtoken';

import User from '../models/User.js';

const connectedUsers = new Map();

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
    connectedUsers.set(socket.userId, socket.id);
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

    socket.on('disconnect', async () => {
      connectedUsers.delete(socket.userId);
      await User.findByIdAndUpdate(socket.userId, { status: 'offline' });
      io.emit('presence:update', { userId: socket.userId, status: 'offline' });
    });
  });
};

export default setupSocketIO;
