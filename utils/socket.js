const socketIO = require('socket.io');
const Chat = require('../models/chatModel');

/**
 * Initialize Socket.IO for real-time chat
 * @param {Object} server - HTTP server instance
 */
const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST']
    }
  });

  // Store active users
  const activeUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // User joins their team room
    socket.on('join-team', ({ userId, teamId }) => {
      socket.join(teamId);
      activeUsers.set(userId, { socketId: socket.id, teamId });
      console.log(`User ${userId} joined team ${teamId}`);
    });

    // Handle new message
    socket.on('send-message', async ({ teamId, senderId, message }) => {
      try {
        // Save message to database
        const newMessage = await Chat.create({
          team: teamId,
          sender: senderId,
          message: message
        });

        // Populate sender details
        await newMessage.populate('sender', 'name email');

        // Broadcast to all users in the team room
        io.to(teamId).emit('receive-message', newMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ teamId, userName }) => {
      socket.to(teamId).emit('user-typing', { userName });
    });

    socket.on('stop-typing', ({ teamId }) => {
      socket.to(teamId).emit('user-stop-typing');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Remove user from active users
      for (const [userId, data] of activeUsers.entries()) {
        if (data.socketId === socket.id) {
          activeUsers.delete(userId);
          break;
        }
      }
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;