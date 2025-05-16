// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/register - Register a new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// GET /api/auth/me - Get current user
router.get('/me', auth, authController.getCurrentUser);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

module.exports = router;