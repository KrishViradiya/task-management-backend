// backend/scripts/createAdminUser.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const { setDefaultPermissions } = require("../src/middleware/rbacMiddleware");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Admin user details
const adminUser = {
  username: "admin",
  email: "admin@example.com",
  password: "admin123", // This will be hashed by the User model
  role: "admin",
};

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: adminUser.email }, { username: adminUser.username }],
    });

    if (existingAdmin) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    // Create new admin user
    const newAdmin = new User(adminUser);

    // Set default permissions based on admin role
    setDefaultPermissions(newAdmin);

    await newAdmin.save();

    console.log("Admin user created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();
