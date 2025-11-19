require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const initializeSocket = require('./utils/socket');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const problemRoutes = require('./routes/problemRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible in req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'eXQ API is running',
    timestamp: new Date().toISOString()
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to eXQ API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      faculty: '/api/faculty',
      admin: '/api/admin',
      problems: '/api/problems',
      payments: '/api/payments',
      chats: '/api/chats',
      leaderboard: '/api/leaderboard'
    }
  });
});

// 404 Error handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║   🚀 eXQ Server is Running           ║
    ║   📡 Port: ${PORT}                       ║
    ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}        ║
    ║   🔗 API: http://localhost:${PORT}      ║
    ╚═══════════════════════════════════════╝
  `);

  // Optional: run fix script automatically on server start when enabled
  try {
    const { exec } = require('child_process');
    const runFix = process.env.RUN_FIX_TEAMS === 'true';
    const dry = process.env.FIX_DRY === 'true' ? '--dry-run' : '';
    if (runFix) {
      console.log('Running team capacity fix script as RUN_FIX_TEAMS=true ...');
      exec(`node "${__dirname.replace(/\\/g, '/')}"/fix_team_capacity.js ${dry}`, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
          console.error('Error running fix_team_capacity.js:', err);
          return;
        }
        if (stdout) console.log('fix_team_capacity output:\n', stdout);
        if (stderr) console.error('fix_team_capacity stderr:\n', stderr);
      });
    }
  } catch (e) {
    console.error('Failed to spawn fix script:', e);
  }
});

// git add .
// git commit -m "msg"
// git push