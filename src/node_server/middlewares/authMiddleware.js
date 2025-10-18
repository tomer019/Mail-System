// middlewares/authMiddleware.js
// NOTE: comments in English only

const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Mongoose user model

const SECRET = process.env.JWT_SECRET || "dev_only_replace";

async function authenticateToken(req, res, next) {
  try {
    // Accept "Authorization: Bearer <token>"
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, SECRET);
    } catch (e) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Expect a subject id on the token (either sub or userId)
    const userId = payload.sub || payload.userId || null;
    if (!userId) {
      return res.status(401).json({ error: "Token missing subject" });
    }

    // Fetch user from MongoDB (ensure the account still exists)
    const user = await User.findById(userId).select("-passwordHash").lean();
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach both raw payload and user document (without password)
    req.auth = payload; // the JWT claims (e.g., sub, email, iat, exp)
    req.user = user;    // the MongoDB user doc for controllers

    return next();
  } catch (err) {
    console.error("[AUTH] middleware error:", err);
    return res.status(500).json({ error: "Auth middleware failure" });
  }
}

module.exports = authenticateToken;
