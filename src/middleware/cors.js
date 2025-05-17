// backend/src/middleware/cors.js
const corsMiddleware = (req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

  // Set CORS headers
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  next();
};

module.exports = corsMiddleware;
