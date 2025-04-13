const { Server } = require('socket.io');

// Map to store active connections
const users = new Map();
let io = null;

/**
 * Initialize socket.io server with performance optimizations
 * Uses singleton pattern to ensure only one instance is created
 */
function initSocket(server) {
  // Only initialize once
  if (io) {
    console.log('Socket.io already initialized, reusing instance');
    return io;
  }

  // Create socket server with performance optimizations
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    // Performance optimizations
    transports: ['websocket', 'polling'], // Prefer websocket over polling
    pingTimeout: 30000,
    pingInterval: 25000,
    connectTimeout: 10000,
    // Disable per-message deflate compression for faster message transmission
    perMessageDeflate: false,
    // Set maximum per-server connections
    maxHttpBufferSize: 1e6, // 1MB
    // Set socket timeout
    upgradeTimeout: 10000,
    // Disable cookies
    cookie: false
  });

  io.on('connection', (socket) => {
    // Disable logging for production
    if (process.env.NODE_ENV !== 'production') {
      console.log('A user connected:', socket.id);
    }
    
    // User connects and registers their userId
    socket.on('register', (userId) => {
      if (!userId) return;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`User ${userId} registered`);
      }
      users.set(userId, socket.id);
    });
    
    // Handle sending messages
    socket.on('send-message', (data) => {
      const { userId, message } = data;
      if (!userId || !message) return;
      
      const receiverSocketId = users.get(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', message);
      }
    });
    
    // Handle typing indicators
    socket.on('typing', (data) => {
      const { userId, senderId } = data;
      if (!userId || !senderId) return;
      
      const receiverSocketId = users.get(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-typing', { senderId });
      }
    });
    
    socket.on('stop-typing', (data) => {
      const { userId } = data;
      if (!userId) return;
      
      const receiverSocketId = users.get(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-stop-typing');
      }
    });
    
    // Remove user on disconnect
    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('A user disconnected');
      }
      
      // Find and remove the user from the Map - more efficiently
      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          users.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}

module.exports = initSocket;
