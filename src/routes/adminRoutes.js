// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole(['admin']));

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/permissions', adminController.updateUserPermissions);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;