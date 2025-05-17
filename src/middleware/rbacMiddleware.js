// backend/src/middleware/rbacMiddleware.js
const User = require("../models/User");

/**
 * Middleware to check if user has required role
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Express middleware
 */
exports.requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      // Get user from database to ensure we have the latest role information
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user's role is in the allowed roles array
      if (roles.includes(user.role)) {
        next();
      } else {
        res.status(403).json({
          message: "Access denied. You do not have the required role.",
        });
      }
    } catch (error) {
      res.status(500).json({
        message: "Error checking user role",
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to check if user has specific permission
 * @param {String} permission - Permission to check
 * @returns {Function} Express middleware
 */
exports.requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Get user from database to ensure we have the latest permissions
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin role has all permissions
      if (user.role === "admin") {
        return next();
      }

      // Check if user has the required permission
      if (user.permissions && user.permissions[permission]) {
        next();
      } else {
        res.status(403).json({
          message: "Access denied. You do not have the required permission.",
        });
      }
    } catch (error) {
      res.status(500).json({
        message: "Error checking user permission",
        error: error.message,
      });
    }
  };
};

/**
 * Set default permissions based on role
 * @param {Object} user - User object
 */
exports.setDefaultPermissions = (user) => {
  switch (user.role) {
    case "admin":
      user.permissions = {
        createTask: true,
        updateAnyTask: true,
        deleteAnyTask: true,
        assignTask: true,
        viewAllTasks: true,
        manageUsers: true,
      };
      break;
    case "manager":
      user.permissions = {
        createTask: true,
        updateAnyTask: true,
        deleteAnyTask: false,
        assignTask: true,
        viewAllTasks: true,
        manageUsers: false,
      };
      break;
    case "user":
    default:
      user.permissions = {
        createTask: true,
        updateAnyTask: false,
        deleteAnyTask: false,
        assignTask: false,
        viewAllTasks: false,
        manageUsers: false,
      };
      break;
  }

  return user;
};
