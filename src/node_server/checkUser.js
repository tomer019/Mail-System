// checkUser.js
// NOTE: comments in English only
require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const User = require("./models/User"); // <-- FIX HERE

(async () => {
    try {
        const email = (process.argv[2] || "").toLowerCase().trim();
        if (!email) {
            console.error("Usage: node checkUser.js <email>");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
        const u = await User.findOne({ email }).select("-passwordHash").lean();
        console.log(u || "NOT FOUND");
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
})();
