const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Get user notifications
router.get('/', auth, notificationController.getUserNotifications);

// Get unread count
router.get('/unread-count', auth, notificationController.getUnreadCount);

// Mark as read
router.put('/:id/read', auth, notificationController.markAsRead);

module.exports = router;
