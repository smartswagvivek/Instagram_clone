# Instagram Clone - Complete Setup & Documentation

## 📋 Project Overview

A **production-ready** Instagram clone built with the MERN stack (MongoDB, Express.js, React.js, Node.js) featuring real-time messaging, notifications, and a comprehensive admin panel.

### Tech Stack
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Socket.IO
- **Frontend**: React.js, Redux Toolkit, Tailwind CSS, Vite
- **Authentication**: JWT with refresh tokens
- **Media Upload**: Cloudinary
- **Real-time**: Socket.IO for messaging & notifications

### Key Features
✅ User Authentication (signup, login, logout)
✅ JWT-based Auth with refresh tokens
✅ User Profiles (bio, followers, following)
✅ Post Creation & Editing with Image Upload
✅ Feed (chronological & algorithm-based)
✅ Real-time Messaging with Socket.IO
✅ Notifications (likes, comments, follows)
✅ Like, Comment, Save functionality
✅ Follow/Unfollow system
✅ Search users & posts
✅ Explore page with trending posts
✅ Admin Dashboard & Moderation
✅ Dark mode support
✅ Infinite scrolling
✅ Rate limiting & Security

---

## 📁 Project Structure

```
Instagram/
├── backend/
│   ├── config/
│   │   └── cloudinary.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── requestLogger.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   └── Story.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── post.js
│   │   ├── comment.js
│   │   ├── messaging.js
│   │   ├── notification.js
│   │   └── admin.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── .env.example
│   ├── package.json
│   ├── jest.config.js
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── PostCard.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── FeedPage.jsx
│   │   │   ├── ExplorePage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── MessagesPage.jsx
│   │   │   ├── NotificationsPage.jsx
│   │   │   ├── CreatePostPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   └── slices/
│   │   │       ├── authSlice.js
│   │   │       ├── postSlice.js
│   │   │       ├── messageSlice.js
│   │   │       ├── notificationSlice.js
│   │   │       └── uiSlice.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account for media upload

### Backend Setup

#### 1. Clone and Navigate
```bash
cd backend
npm install
```

#### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/instagram_clone
DB_NAME=instagram_clone

# JWT
JWT_SECRET=your_secret_key_here
REFRESH_TOKEN_SECRET=your_refresh_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=5000
NODE_ENV=development
HOST=localhost

# Admin
ADMIN_EMAIL=admin@instagram-clone.com
ADMIN_PASSWORD=ChangeMe@123
```

#### 3. Start Backend
```bash
# Development with nodemon
npm run dev

# Production
npm start
```

Backend runs on `http://localhost:5000`

### Frontend Setup

#### 1. Navigate and Install
```bash
cd frontend
npm install
```

#### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=Instagram Clone
```

#### 3. Start Frontend
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/profile/update` | Update profile |
| POST | `/api/users/profile-picture/upload` | Upload profile picture |
| POST | `/api/users/:id/follow` | Follow user |
| POST | `/api/users/:id/unfollow` | Unfollow user |
| GET | `/api/users/search?q=query` | Search users |
| GET | `/api/users/:id/followers` | Get followers list |
| GET | `/api/users/:id/following` | Get following list |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/create` | Create new post |
| GET | `/api/posts/feed?page=1` | Get user feed |
| GET | `/api/posts/explore?page=1` | Get explore posts |
| GET | `/api/posts/:id` | Get post details |
| POST | `/api/posts/:id/like` | Like post |
| POST | `/api/posts/:id/unlike` | Unlike post |
| POST | `/api/posts/:id/save` | Save post |
| POST | `/api/posts/:id/unsave` | Unsave post |
| DELETE | `/api/posts/:id` | Delete post |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments/:postId/create` | Create comment |
| GET | `/api/comments/:postId` | Get post comments |
| DELETE | `/api/comments/:id` | Delete comment |
| POST | `/api/comments/:id/like` | Like comment |
| POST | `/api/comments/:id/unlike` | Unlike comment |

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/send` | Send message |
| GET | `/api/messages/conversation/:userId?page=1` | Get conversation |
| GET | `/api/messages/conversations` | Get all conversations |
| PUT | `/api/messages/:id/mark-read` | Mark message as read |
| DELETE | `/api/messages/:id` | Delete message |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications?page=1` | Get notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/:id/mark-read` | Mark as read |
| PUT | `/api/notifications/mark-all-read` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users?page=1` | List users |
| PUT | `/api/admin/users/:id/deactivate` | Deactivate user |
| PUT | `/api/admin/users/:id/activate` | Activate user |
| GET | `/api/admin/posts?page=1` | List posts |
| DELETE | `/api/admin/posts/:id` | Delete post |
| GET | `/api/admin/stats` | Get platform stats |

---

## 🔐 Authentication Flow

1. **Signup**: User registers with email, username, password
2. **Login**: Credentials verified, JWT tokens issued
3. **Token Storage**: Access token in memory, refresh token in localStorage
4. **Auto-refresh**: When access token expires, refresh token automatically gets new one
5. **Logout**: Tokens cleared from storage

---

## 🔄 Socket.IO Events

### Real-time Messaging
```javascript
// Emit
socket.emit('send-message', { recipientId, text });
socket.emit('typing', { recipientId, username });
socket.emit('stop-typing', { recipientId });
socket.emit('message-read', { messageId, recipientId });

// Listen
socket.on('receive-message', (message) => {});
socket.on('user-typing', ({ userId, username }) => {});
socket.on('user-stop-typing', ({ userId }) => {});
socket.on('message-read-receipt', ({ messageId }) => {});
```

### Notifications
```javascript
socket.emit('post-liked', { postAuthorId, notificationData });
socket.emit('post-commented', { postAuthorId, notificationData });
socket.emit('user-followed', { targetUserId, notificationData });

socket.on('notification', (notification) => {});
```

### User Status
```javascript
socket.emit('set-status', 'online' | 'offline' | 'away');
socket.on('user-status-changed', ({ userId, status }) => {});
```

---

## 📊 Database Models

### User Schema
```javascript
{
  username, email, password (hashed),
  fullName, bio, profilePicture,
  website, phone,
  followers[], following[],
  savedPosts[], role (user/admin),
  isActive, status,
  timestamps
}
```

### Post Schema
```javascript
{
  author, caption, images[],
  likes[], comments[],
  saves[], location,
  hashtags[], mentions[],
  visibility (public/followers/private),
  engagementMetrics: { views, shares, saves },
  timestamps
}
```

### Message Schema
```javascript
{
  sender, recipient,
  text, media[],
  isRead, readAt,
  reaction, replyTo,
  edited, editedAt,
  timestamps
}
```

---

## 🧪 Running Tests

```bash
# Backend tests
cd backend
npm test

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
```

---

## 🚢 Deployment

### Deploy Backend on Vercel/Railway
```bash
# Add vercel.json or railway.toml
npm run build
# Push to GitHub and configure in hosting platform
```

### Deploy Frontend on Vercel
```bash
npm run build
# Deploy dist folder on Vercel
```

### Environment Variables in Production
Set all variables in `.env` on hosting platform dashboard

---

## 🔒 Security Features

✅ JWT authentication with exp times
✅ Password hashing with bcrypt
✅ Rate limiting on auth endpoints
✅ CORS configuration
✅ Helmet middleware for HTTP headers
✅ Input validation with express-validator
✅ No sensitive data in response
✅ Automatic token refresh
✅ Admin role-based access control

---

## 📈 Performance Optimization

✅ Database indexes on frequently queried fields
✅ Pagination for large datasets
✅ Image optimization by Cloudinary
✅ Client-side caching
✅ Lazy loading for images
✅ Code splitting in Vite build
✅ Minified production builds
✅ Socket.IO connection pooling

---

## 🐛 Troubleshooting

### Issue: CORS Error
**Solution**: Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL

### Issue: Cloudinary Upload Fails
**Solution**: Verify Cloudinary credentials and account permissions

### Issue: MongoDB Connection Failed
**Solution**: Check MongoDB URI and network access in Atlas

### Issue: Socket.IO Not Connecting
**Solution**: Ensure frontend `SOCKET_URL` matches backend URL

---

## 📝 Demo Credentials

```
Email: demo@gmail.com
Password: demo123
```

---

## 📚 Additional Resources

- [MongoDB Docs](https://docs.mongodb.com)
- [Express.js Guide](https://expressjs.com)
- [React Hooks](https://react.dev)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [Socket.IO Client](https://socket.io/docs/v4/client-api)
- [Tailwind CSS](https://tailwindcss.com)
- [Cloudinary Upload](https://cloudinary.com/documentation)

---

## 📜 License

MIT License - feel free to use this project for learning or deployment

---

**Built with ❤️ for the community**
