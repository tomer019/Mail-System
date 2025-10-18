const express = require("express");
const app = express();
app.use((req, res, next) => { // Middleware to log requests. Added for debugging by Meir in exercise 4
  console.log(`[SERVER] ${req.method} ${req.url}`);
  next();
});
const cors = require('cors');

// Load environment variables
app.use(cors());    // Enable CORS for all routes
// Middleware to parse JSON bodies
app.use(express.json());

// Load routes
const router = require("./routes");
app.use("/api", router);

// TCP Client wrapper (blacklist functions)
const blacklistClient = require("./utils/blacklistClient");
app.set("blacklistClient", blacklistClient); // exposes checkUrlBlacklist, addUrlToBlacklist, deleteUrlFromBlacklist


//app.use("/api/labels", require("./routes/labels")); - remove in exercises 4 becuse we moved the labels routes to the main router

// Healthcheck route for Docker
app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});

// Fallback for unknown endpoints
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
