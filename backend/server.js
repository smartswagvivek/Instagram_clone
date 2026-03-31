import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import app from './app.js';
import { connectDB } from './config/db.js';
import setupSocketIO from './socket/socketHandler.js';

dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);
app.set('io', io);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT);
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

server.on('listening', () => {
  console.log(`API running on http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process.`);
    process.exit(1);
    return;
  }

  console.error('Server failed to start', error);
  process.exit(1);
});

start();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
start();
