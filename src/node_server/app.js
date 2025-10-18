const express = require("express");
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Load routes
const router = require("./routes");
app.use("/api", router);

// TCP Client wrapper (blacklist functions)
const blacklistClient = require("./utils/blacklistClient");
app.set("blacklistClient", blacklistClient); // exposes checkUrlBlacklist, addUrlToBlacklist, deleteUrlFromBlacklist

app.use("/api/labels", require("./routes/labels"));

// Fallback for unknown endpoints
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
