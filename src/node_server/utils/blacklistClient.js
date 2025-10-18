// utils/blacklistClient.js - MongoDB-based blacklist client
// NOTE: comments in English only

const Blacklist = require("../models/Blacklist");

// Check if URL is blacklisted using MongoDB
async function checkUrlBlacklist(url) {
    try {
        console.log("[BlacklistClient] Checking URL in MongoDB:", url);
        
        const isBlacklisted = await Blacklist.isBlacklisted(url);
        
        console.log("[BlacklistClient] URL check result:", isBlacklisted);
        return isBlacklisted;
        
    } catch (error) {
        console.error("[BlacklistClient] Error checking URL:", error.message);
        // In case of error, assume URL is safe (don't block legitimate emails)
        return false;
    }
}

// Add URL to blacklist using MongoDB
async function addUrlToBlacklist(url, reason = "Spam detection") {
    try {
        console.log("[BlacklistClient] Adding URL to MongoDB:", url);
        
        // Check if URL already exists
        const exists = await Blacklist.isBlacklisted(url);
        if (exists) {
            console.log("[BlacklistClient] URL already exists in blacklist:", url);
            return { status: 200, alreadyExists: true, data: { url } };
        }
        
        // Add new URL to blacklist
        const blacklistEntry = await Blacklist.addUrl(url, null, reason);
        
        console.log("[BlacklistClient] URL added successfully:", url);
        return { 
            status: 201, 
            data: {
                url: blacklistEntry.url, 
                id: blacklistEntry._id.toString(),
                createdAt: blacklistEntry.createdAt
            }
        };
        
    } catch (error) {
        console.error("[BlacklistClient] Error adding URL:", error.message);
        throw new Error(`Failed to add URL to blacklist: ${error.message}`);
    }
}

// Remove URL from blacklist using MongoDB
async function deleteUrlFromBlacklist(identifier) {
    try {
        console.log("[BlacklistClient] Removing from MongoDB, identifier:", identifier);
        
        // Try to remove by URL (identifier is the URL itself)
        const wasRemoved = await Blacklist.removeUrl(identifier);
        
        if (wasRemoved) {
            console.log("[BlacklistClient] URL removed successfully:", identifier);
            return { status: 204 };
        } else {
            console.log("[BlacklistClient] URL not found for removal:", identifier);
            return { status: 404 };
        }
        
    } catch (error) {
        console.error("[BlacklistClient] Error removing URL:", error.message);
        throw new Error(`Failed to remove URL from blacklist: ${error.message}`);
    }
}

// Get all blacklisted URLs using MongoDB
async function getAllBlacklistedUrls() {
    try {
        console.log("[BlacklistClient] Fetching all blacklisted URLs from MongoDB");
        
        const urls = await Blacklist.getAllUrls();
        
        console.log("[BlacklistClient] Found", urls.length, "blacklisted URLs");
        return urls;
        
    } catch (error) {
        console.error("[BlacklistClient] Error fetching URLs:", error.message);
        throw new Error(`Failed to fetch blacklisted URLs: ${error.message}`);
    }
}

module.exports = {
    checkUrlBlacklist,
    addUrlToBlacklist,
    deleteUrlFromBlacklist,
    getAllBlacklistedUrls
};