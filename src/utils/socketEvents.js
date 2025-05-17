// backend/src/utils/socketEvents.js

/**
 * Emit a notification to a specific user
 * @param {Object} io - Socket.IO instance
 * @param {String} userId - User ID to send notification to
 * @param {Object} notification - Notification object
 */
const emitNotification = (io, userId, notification) => {
  if (!io || !userId || !notification) {
    console.error('Missing required parameters for emitNotification');
    return;
  }

  try {
    // Emit to the user's specific room
    io.to(`user:${userId}`).emit('notification', notification);
    console.log(`Notification emitted to user:${userId}`);
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

/**
 * Emit a task update to all collaborators
 * @param {Object} io - Socket.IO instance
 * @param {Array} userIds - Array of user IDs to notify
 * @param {Object} task - Updated task object
 */
const emitTaskUpdate = (io, userIds, task) => {
  if (!io || !userIds || !userIds.length || !task) {
    console.error('Missing required parameters for emitTaskUpdate');
    return;
  }

  try {
    // Emit to each user's room
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('taskUpdate', task);
    });
    console.log(`Task update emitted to ${userIds.length} users`);
  } catch (error) {
    console.error('Error emitting task update:', error);
  }
};

module.exports = {
  emitNotification,
  emitTaskUpdate
};