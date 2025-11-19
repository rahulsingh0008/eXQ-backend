const express = require('express');
const router = express.Router();
const {
  getTeamChats,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Chat routes
router.get('/team/:teamId', getTeamChats);
router.post('/team/:teamId', sendMessage);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.put('/:id/read', markAsRead);

module.exports = router;