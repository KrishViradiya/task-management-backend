// backend/src/middleware/optionsHandler.js
const optionsHandler = (req, res, next) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    return res.status(200).json({});
  }
  next();
};

module.exports = optionsHandler;
