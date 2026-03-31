# SETUP GUIDE - Step by Step

## 🎯 Quick Start (5 minutes)

### Step 1: Setup MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create cluster (choose free tier)
4. Create database user with password
5. Whitelist your IP (Allow Access from Anywhere: 0.0.0.0/0)
6. Copy connection string

### Step 2: Setup Cloudinary
1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for free account
3. Get Cloud Name, API Key, API Secret from dashboard

### Step 3: Backend Setup
```bash
cd backend
npm install

# Create .env file
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/instagram_clone
DB_NAME=instagram_clone
JWT_SECRET=your_jwt_secret_12345
REFRESH_TOKEN_SECRET=your_refresh_secret_67890
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
NODE_ENV=development
HOST=localhost
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_EMAIL=admin@instagram-clone.com
ADMIN_PASSWORD=ChangeMe@123
EOF

# Start backend
npm run dev
```

### Step 4: Frontend Setup
```bash
cd frontend
npm install

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=Instagram Clone
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_MESSAGING=true
EOF

# Start frontend
npm run dev
```

Visit: `http://localhost:3000`

---

## 🔧 Detailed Configuration

### MongoDB Atlas Connection
1. Create cluster → "Connect" → "Drivers" → Copy URI
2. Replace `<username>`, `<password>`, `<database>`
3. Format: `mongodb+srv://user:pass@host/dbname?retryWrites=true&w=majority`

### Cloudinary Setup
1. Dashboard → Settings → API Keys
2. Copy all three values
3. Create folder /cloudinary-storage for uploads (optional)

### JWT Secrets
Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Verification Checklist

- [ ] MongoDB connected (check server logs for connection message)
- [ ] Cloudinary uploading images (test in create post)
- [ ] JWT tokens being issued (check browser storage)
- [ ] Socket.IO connecting (check console for connection event)
- [ ] All 3000/5000 ports accessible
- [ ] CORS errors resolved
- [ ] Admin panel accessible with admin role

---

## 🚀 Testing Features

### 1. Authentication
- Sign up with new account
- Login with credentials
- Verify JWT in localStorage

### 2. Post Features
- Create post with image
- Like/Unlike post
- Comment on post
- Save post

### 3. Messaging
- Send message to another user
- Receive real-time messages
- See typing indicators
- Mark message as read

### 4. Notifications
- Follow user → notification
- Like post → notification
- Comment → notification

### 5. Admin Panel
- View platform statistics
- Deactivate/activate users
- Delete inappropriate posts
- Monitor user activity

---

## 🐛 Common Issues & Fixes

### CORS Error: `Access-Control-Allow-Origin`
```bash
# Fix: Update backend .env
CORS_ORIGIN=http://localhost:3000,http://your-domain.com
```

### Cloudinary Upload Fails
```bash
# Check:
1. API credentials are correct
2. Account is not suspended
3. File size < 100MB
4. Internet connection stable
```

### Socket.IO Not Connecting
```bash
# Check:
1. Backend running on port 5000
2. SOCKET_URL correct in frontend
3. Token being sent to Socket.IO
4. Firewall allowing WebSocket
```

### MongoDB Connection Timeout
```bash
# Fix:
1. Whitelist your IP in Atlas
2. Use correct connection string
3. Check network connectivity
4. Verify database name
```

### JWT Token Expired
```javascript
// Auto-refresh happens in api.js
// If still failing, clear localStorage and re-login
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
window.location.href = '/login';
```

---

## 📦 Production Deployment

### Backend Deployment (Railway/Render)

1. **Prepare**
```bash
# Update .env to production
NODE_ENV=production
```

2. **Deploy**
```bash
# Push to GitHub
git push origin main

# Connect to Railway/Render
# Select repository
# Set environment variables
# Deploy
```

3. **Verify**
```bash
# Test API endpoints
curl https://your-backend.railway.app/api/health
```

### Frontend Deployment (Vercel)

1. **Build**
```bash
npm run build
```

2. **Deploy**
```bash
# Via Vercel CLI
npm i -g vercel
vercel

# Or on Vercel Dashboard
# Connect GitHub repo → Deploy
```

3. **Update API URL**
```env
VITE_API_URL=https://your-backend.vercel.app/api
VITE_SOCKET_URL=https://your-backend.vercel.app
```

---

## 🎓 Learning Path

1. **Basics** (Day 1)
   - Understand folder structure
   - Review authentication flow
   - Test signup/login

2. **Features** (Day 2-3)
   - Create posts
   - Add comments
   - Follow users

3. **Advanced** (Day 4-5)
   - Real-time messaging
   - Socket.IO events
   - Notifications

4. **Admin** (Day 5-6)
   - Admin panel
   - User management
   - Content moderation

5. **Deployment** (Day 7)
   - Production build
   - Environment setup
   - Deployment

---

## 📱 Mobile Responsive

The app is built with mobile-first design:
- Sidebar collapses on mobile
- Touch-friendly buttons
- Responsive grid layouts
- Optimized for all screen sizes

---

**You're all set! Happy coding! 🚀**
