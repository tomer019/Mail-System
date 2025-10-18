const express = require("express");
const router = express.Router();

const usersRouter = require('./authRoutes');
const mailsRouter = require("./mailRoutes");
const blacklistRouter = require("./blacklist");//was previously in comment
const labelsRouter = require("./labels");

router.use("/", usersRouter);
router.use("/mails", mailsRouter);
router.use("/blacklist", blacklistRouter); //was previously in comment
router.use("/labels", labelsRouter);

module.exports = router;
