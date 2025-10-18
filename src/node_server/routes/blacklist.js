const express = require("express");
const controller = require("../controllers/blacklistController");
const router = express.Router();

// Get all blacklisted URLs
router.get("/", controller.getAll);

// Add URL to blacklist
router.post("/", controller.add);

// Remove URL from blacklist
router.delete("/:url", controller.remove);

module.exports = router;