const { addUrlToBlacklist, deleteUrlFromBlacklist, getAllBlacklistedUrls } = require("../utils/blacklistClient");

// Add URL to blacklist
async function add(req, res) {
  const { url, reason } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const result = await addUrlToBlacklist(url, reason);
    
    if (result.alreadyExists) {
      return res.status(200).json({ 
        message: "URL already in blacklist", 
        data: result.data 
      });
    }
    
    return res.status(201).json({ 
      message: "URL added to blacklist successfully", 
      data: result.data,
      warning: result.warning || null
    });
  } catch (err) {
    console.error("Error adding URL to blacklist:", err);
    return res.status(500).json({ error: "Failed to add URL to blacklist" });
  }
}

// Remove URL from blacklist
async function remove(req, res) {
  const { url } = req.params;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  
  try {
    const result = await deleteUrlFromBlacklist(decodeURIComponent(url));
    
    if (result.status === 404) {
      return res.status(404).json({ error: "URL not found in blacklist" });
    }
    
    return res.status(204).end(); // No Content
  } catch (err) {
    console.error("Error deleting URL from blacklist:", err);
    return res.status(500).json({ error: "Failed to delete URL from blacklist" });
  }
}

// Get all blacklisted URLs
async function getAll(req, res) {
  try {
    const urls = await getAllBlacklistedUrls();
    return res.status(200).json({
      message: "Blacklisted URLs retrieved successfully",
      count: urls.length,
      data: urls
    });
  } catch (err) {
    console.error("Error fetching blacklisted URLs:", err);
    return res.status(500).json({ error: "Failed to fetch blacklisted URLs" });
  }
}

module.exports = {
  add,
  remove,
  getAll,
};