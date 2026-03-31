import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import postRoutes from './routes/post.js';
import commentRoutes from './routes/comment.js';
import storyRoutes from './routes/story.js';
import messagingRoutes from './routes/messaging.js';
import notificationRoutes from './routes/notification.js';
import adminRoutes from './routes/admin.js';
import rateLimiter from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
const cors = require("cors"); 
const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://https://instagram-clone-delta-blue.vercel.app/"
  ],
  credentials: true
}));

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(requestLogger);
app.use(rateLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'instagram-clone-api',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
