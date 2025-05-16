// backend/src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// GET /api/notifications - Get all notifications for current user
router.get('/', notificationController.getNotifications);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// GET /api/notifications/unread/count - Get unread notification count
router.get('/unread/count', notificationController.getUnreadCount);

module.exports = router;