// backend/src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const cors = require("cors");

// Configure CORS specifically for auth routes
const authCors = cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://task-management-frontend-beta-ivory.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Handle preflight requests for all auth routes
router.options("*", authCors);

// POST /api/auth/register - Register a new user
router.post("/register", authCors, authController.register);

// POST /api/auth/login - Login user
router.post("/login", authCors, authController.login);

// GET /api/auth/me - Get current user
router.get("/me", authCors, auth, authController.getCurrentUser);

// POST /api/auth/logout - Logout user
router.post("/logout", authCors, authController.logout);

module.exports = router;
