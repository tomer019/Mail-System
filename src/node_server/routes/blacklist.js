const express = require("express");
const controller = require("../controllers/blacklistController");
const router = express.Router();

router.post("/", controller.add);
router.delete("/:url", controller.remove);

module.exports = router;