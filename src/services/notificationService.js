// backend/src/services/notificationService.js
const Notification = require('../models/Notification');
const { emitNotification } = require('../utils/socketEvents');

/**
 * Create a new notification and emit it via Socket.IO
 * @param {Object} req - Express request object (to access io)
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
exports.createNotification = async (req, notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    
    // Get populated notification for emitting
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username')
      .populate('task', 'title');
    
    // Get Socket.IO instance from app
    const io = req.app.get('io');
    
    // Emit notification to recipient
    if (io) {
      emitNotification(io, notification.recipient.toString(), populatedNotification);
    }
    
    return populatedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create multiple notifications at once and emit them via Socket.IO
 * @param {Object} req - Express request object (to access io)
 * @param {Array} notificationsData - Array of notification data objects
 * @returns {Promise<Array>} Created notifications
 */
exports.createManyNotifications = async (req, notificationsData) => {
  try {
    const notifications = await Notification.insertMany(notificationsData);
    
    // Get Socket.IO instance from app
    const io = req.app.get('io');
    
    if (io) {
      // For each notification, populate and emit
      for (const notification of notifications) {
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'username')
          .populate('task', 'title');
        
        emitNotification(io, notification.recipient.toString(), populatedNotification);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating multiple notifications:', error);
    throw error;
  }
};