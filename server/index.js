require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { createRedisClient } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { errorHandler } = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');

// Routes
const authRoutes = require('./routes/auth.routes');
const issueRoutes = require('./routes/issues.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notifications.routes');
const statsRoutes = require('./routes/stats.routes');
const officerRoutes = require('./routes/officer.routes');
const categoryRoutes = require('./routes/categories.routes');

const app = express();
const httpServer = http.createServer(app);

// Connect to MongoDB
connectDB();

// Init Redis
const redisClient = createRedisClient();
app.set('redis', redisClient);

// Init Socket.IO
const io = initSocket(httpServer, redisClient);
app.set('io', io);

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:", "https://nominatim.openstreetmap.org"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitize);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

app.use(generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/categories', categoryRoutes);

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`🚀 CivicPulse v2 running on http://localhost:${PORT}`);
  console.log(`   MongoDB: ${process.env.MONGODB_URI?.split('@')[1] || process.env.MONGODB_URI || 'connecting...'}`);
  console.log(`   Redis:   ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
});

module.exports = { app };
