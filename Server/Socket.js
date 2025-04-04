const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const cookie = require('cookie');

let io;

const initializeSocket = (server) => {
  console.log('Initializing Socket.io server...');
  
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
    }
  });

  // Debug middleware to log all connections
  io.use((socket, next) => {
    console.log('New socket connection attempt:', socket.id);
    
    try {
      // Get cookies from handshake headers
      const cookies = socket.handshake.headers.cookie 
        ? cookie.parse(socket.handshake.headers.cookie)
        : {};
      
      // Extract token from cookies
      const token = cookies.token;
      
      console.log('Cookie token found?', !!token);
      
      if (!token) {
        console.log('No token in cookies, allowing connection without user ID');
        socket.userId = null;
        return next();
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      console.log('Authenticated socket for user:', socket.userId);
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      socket.userId = null;
      // Still allow connection for websocket to work, but without auth
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}, User ID: ${socket.userId || 'unauthenticated'}`);
    
    // Join user's personal notification room if authenticated
    socket.on('join-notification-room', (userId) => {
      // Only allow joining if authenticated or joining your own room
      if (socket.userId === null || socket.userId === userId) {
        console.log(`User ${userId} joined notification room: notification:${userId}`);
        socket.join(`notification:${userId}`);
        
        // Send a test notification to confirm room joining worked
        socket.emit('test-notification', { message: 'Successfully joined notification room' });
      } else {
        console.log(`Authentication mismatch: Socket user ${socket.userId} attempted to join ${userId}'s room`);
        socket.emit('error', { message: 'Authentication error: Cannot join another user\'s notification room' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  console.log('Socket.io server initialized successfully');
  return io;
};

// This function needs to be properly exposed and used
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Debug function to emit test notifications
const emitNotification = (userId, notification) => {
  console.log(`Emitting notification to user ${userId}:`, notification.message);
  if (!io) {
    console.error('Socket.io not initialized, cannot emit notification');
    return false;
  }
  
  const room = `notification:${userId}`;
  console.log(`Emitting to room: ${room}`);
  
  io.to(room).emit(notification.type === 'invitation' ? 'workspace-invitation' : 'notification', notification);
  return true;
};

module.exports = {
  initializeSocket,
  getIO,
  emitNotification
};