const express = require("express");
const router = express.Router();

// create user
router.post("/", (req, res) => {
  // todo: implement user creation logic
  res.status(501).json({ error: "Not implemented" });
});

// get user by ID
router.get("/:id", (req, res) => {
  // todo: implement logic to get user by ID
  res.status(501).json({ error: "Not implemented" });
});

module.exports = router;