const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (httpServer, redisClient) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  if (redisClient) {
    const pubClient = redisClient;
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  // JWT auth middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      // Allow unauthenticated connections for public events
      socket.userId = null;
      socket.userRole = 'public';
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userWard = decoded.ward;
      next();
    } catch {
      socket.userId = null;
      socket.userRole = 'public';
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const role = socket.userRole;

    // Personal room
    if (userId) socket.join(`user:${userId}`);

    // Role rooms
    if (role === 'admin') socket.join('room:admin');
    if (role === 'officer') socket.join('room:officer');

    // Public issue feed room
    socket.join('room:public');

    console.log(`Socket connected: ${socket.id} [${role}]${userId ? ` uid:${userId}` : ''}`);

    socket.on('join:ward', (ward) => {
      if (ward) socket.join(`ward:${ward}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} — ${reason}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
