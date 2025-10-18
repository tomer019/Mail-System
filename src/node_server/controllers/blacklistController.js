const { addUrlToBlacklist, deleteUrlFromBlacklist } = require("../utils/blacklistClient");
// This controller handles adding and removing URLs from a blacklist
async function add(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    // If the URL is successfully added, respond with 201 Created
    const result = await addUrlToBlacklist(url); // { id, url }
    res.status(201).json(result);// Return the ID and URL of the added entry
    res.status(201).json({ id: result.id }); // Return only the ID of the added entry

  } catch (err) {
    console.error("Error adding URL to blacklist:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: "Failed to add URL to blacklist" });
  }

}

// This function removes a URL from the blacklist
async function remove(req, res) {
  // Parse the ID from the URL parameter
  const id = parseInt(req.params.id);

  // Validate that the ID is a valid number
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    // Attempt to delete the URL by ID from the blacklist
    const { status } = await deleteUrlFromBlacklist(id);

    // Return the status from the deletion (e.g., 204 if deleted, 404 if not found)
    res.sendStatus(status);
  } catch (err) {
    // Log and return internal server error if something goes wrong
    console.error("Error deleting URL from blacklist:", err);
    res.status(500).json({ error: "Failed to delete URL from blacklist" });
  }
}

/*
async function remove(req, res) {
  const url = req.params.url;
  try {
    const { status } = await deleteUrlFromBlacklist(url);
    res.sendStatus(status); // 204 or 404
  } catch (err) {
    console.error("Error deleting URL from blacklist:", err);
    res.status(500).json({ error: "Failed to delete URL from blacklist" });
  }
}
*/

module.exports = {
  add,
  remove,
};