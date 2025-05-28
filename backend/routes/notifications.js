const express = require('express');
const router = express.Router();
const { 
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  registerDeviceToken
} = require('../controllers/notificationController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Routes protégées pour tous les utilisateurs authentifiés
router.get('/', protect, getUserNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);
router.delete('/', protect, deleteAllNotifications);
router.post('/register-device', protect, registerDeviceToken);

module.exports = router; 