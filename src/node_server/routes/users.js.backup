const express = require("express");
const router = express.Router();

// In-memory user store
const users = new Map(); // key: email, value: user object

// POST /api/users — Register
router.post("/", (req, res) => {
  const { firstName, lastName, email, password, profilePicture } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (users.has(email)) {
    return res.status(409).json({ error: "User already exists" });
  }

  const newUser = { firstName, lastName, email, password, profilePicture };
  users.set(email, newUser);

  return res.status(201).json({ message: "User registered successfully" });
});

// POST /api/users/login — Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.get(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  return res.status(200).json({
    message: "Login successful",
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture || null,
    },
  });
});

// GET /api/users/:id — Not implemented
router.get("/:id", (req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

module.exports = router;
