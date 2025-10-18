const express = require("express");
const router = express.Router();

const usersRouter = require('./authRoutes');
const mailsRouter = require("./mailRoutes");
//const blacklistRouter = require("../../src/node_server/routes/blacklist");
const labelsRouter = require("./labels");

router.use("/users", usersRouter);
router.use("/mails", mailsRouter);
//router.use("/blacklist", blacklistRouter);
router.use("/labels", labelsRouter);

module.exports = router;
