const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors());
app.use(express.static('public'));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user registration with username
  socket.on('register', (username) => {
    users.set(socket.id, {
      username: username || `user_${socket.id.substring(0, 6)}`,
      socketId: socket.id
    });
    
    console.log(`User registered: ${users.get(socket.id).username}`);
    
    // Send back the user's info
    socket.emit('registered', {
      peerId: socket.id,
      username: users.get(socket.id).username
    });
    
    broadcastUserList();
  });

  // WebRTC signaling - Offer
  socket.on('offer', ({ to, offer, filename, filesize }) => {
    console.log(`Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', {
      from: socket.id,
      fromUsername: users.get(socket.id)?.username,
      offer,
      filename,
      filesize
    });
  });

  // WebRTC signaling - Answer
  socket.on('answer', ({ to, answer }) => {
    console.log(`Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', {
      from: socket.id,
      answer
    });
  });

  // WebRTC signaling - ICE Candidate
  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`ICE candidate from ${socket.id} to ${to}`);
    io.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  // Get list of online users
  socket.on('get-users', () => {
    const userList = Array.from(users.entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, user]) => ({
        peerId: id,
        username: user.username
      }));
    
    socket.emit('user-list', userList);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    users.delete(socket.id);
    broadcastUserList();
  });
});

// Broadcast user list to all connected clients
function broadcastUserList() {
  const userList = Array.from(users.entries()).map(([id, user]) => ({
    peerId: id,
    username: user.username
  }));
  
  io.emit('users-updated', userList);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`ShareIt server running on port ${PORT}`);
  console.log(`WebRTC signaling server ready`);
});
