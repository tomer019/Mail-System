const { addUrlToBlacklist, deleteUrlFromBlacklist } = require("../utils/blacklistClient");
// This controller handles adding and removing URLs from a blacklist
async function add(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    await addUrlToBlacklist(url);
    res.sendStatus(201); // Created
  } catch (err) {
    console.error("Error adding URL to blacklist:", err);
    res.status(500).json({ error: "Failed to add URL to blacklist" });
  }
}
// This function removes a URL from the blacklist
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

module.exports = {
  add,
  remove,
};