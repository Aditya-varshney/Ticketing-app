const { Server } = require('socket.io');

// Map to store active connections
const users = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // User connects and registers their userId
    socket.on('register', (userId) => {
      console.log(`User ${userId} registered`);
      users.set(userId, socket.id);
    });
    
    // Handle sending messages
    socket.on('send-message', (data) => {
      const { receiverId, message } = data;
      const receiverSocketId = users.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', message);
      }
    });
    
    // Handle typing indicators
    socket.on('typing', (data) => {
      const { receiverId, senderId } = data;
      const receiverSocketId = users.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-typing', { senderId });
      }
    });
    
    socket.on('stop-typing', (data) => {
      const { receiverId } = data;
      const receiverSocketId = users.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-stop-typing');
      }
    });
    
    // Remove user on disconnect
    socket.on('disconnect', () => {
      console.log('A user disconnected');
      
      // Find and remove the user from the Map
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
