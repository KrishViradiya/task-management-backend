const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./src/config/dbConnect");
const authRoutes = require("./src/routes/authRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const optionsHandler = require("./src/middleware/optionsHandler");
const corsMiddleware = require("./src/middleware/cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const PORT = process.env.PORT || 5000;

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Custom CORS and OPTIONS middleware
app.use(corsMiddleware);
app.use(optionsHandler);

app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Routes (to be added)
app.get("/", (req, res) => {
  res.send("Task Management API is running");
});

// routes
app.use("/auth", authRoutes);
app.use("/notifications", notificationRoutes);
app.use("/tasks", taskRoutes);
app.use("/admin", adminRoutes);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Set a timeout to disconnect if not authenticated within 30 seconds
  const authTimeout = setTimeout(() => {
    if (!socket.userId) {
      console.log(
        "Socket not authenticated within timeout, disconnecting:",
        socket.id
      );
      socket.disconnect(true);
    }
  }, 30000);

  // Authenticate the socket connection
  socket.on("authenticate", (token) => {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Clear the auth timeout
      clearTimeout(authTimeout);

      // Store user ID in socket for later use
      socket.userId = decoded.userId;

      // Leave any previous rooms (in case of reconnection)
      if (socket.userRoom) {
        socket.leave(socket.userRoom);
      }

      // Join a room specific to this user
      const userRoom = `user:${decoded.userId}`;
      socket.join(userRoom);
      socket.userRoom = userRoom;

      console.log(
        `User ${decoded.userId} authenticated and joined room ${userRoom}`
      );

      // Send a confirmation back to the client
      socket.emit("authenticated", { success: true, userId: decoded.userId });

      // Send any pending notifications
      sendPendingNotifications(socket, decoded.userId);
    } catch (error) {
      console.error("Socket authentication failed:", error.message);
      socket.emit("authenticated", {
        success: false,
        error: "Authentication failed",
      });
    }
  });

  socket.on("disconnect", (reason) => {
    clearTimeout(authTimeout);
    console.log(
      `User disconnected (${reason}):`,
      socket.id,
      socket.userId ? `User ID: ${socket.userId}` : ""
    );
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Function to send pending notifications to a user
async function sendPendingNotifications(socket, userId) {
  try {
    // Import the Notification model
    const Notification = require("./src/models/Notification");

    // Find unread notifications for this user
    const unreadNotifications = await Notification.find({
      recipient: userId,
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("sender", "username")
      .populate("task", "title");

    if (unreadNotifications.length > 0) {
      console.log(
        `Sending ${unreadNotifications.length} pending notifications to user ${userId}`
      );

      // Send each notification individually with a slight delay between them
      // This helps ensure the client processes each one correctly
      unreadNotifications.forEach((notification, index) => {
        setTimeout(() => {
          console.log(
            `Emitting notification ${index + 1}/${
              unreadNotifications.length
            } to user ${userId}`
          );
          socket.emit("notification", notification);
        }, index * 300); // 300ms delay between each notification
      });
    }
  } catch (error) {
    console.error("Error sending pending notifications:", error);
  }
}

// Make io accessible to our routes
app.set("io", io);

// Start the server
if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// For Vercel serverless deployment
module.exports = app;
