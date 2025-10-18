// models/Blacklist.js - MongoDB Blacklist Model
const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true 
    },
    
    addedBy: {
        type: String,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        required: false,
        default: null
    },
    
   
    reason: {
        type: String,
        trim: true,
        required: false,
        default: "Spam detection"
    }
}, {
    timestamps: true 
});

// Static methods for easy usage
blacklistSchema.statics.isBlacklisted = async function(url) {
    const result = await this.findOne({ url: url.trim() });
    return !!result; 
};

blacklistSchema.statics.addUrl = async function(url, addedBy = null, reason = null) {
    try {
        const blacklistEntry = new this({
            url: url.trim(),
            addedBy: addedBy, 
            reason: reason || "Spam detection"
        });
        return await blacklistEntry.save();
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            throw new Error('URL already exists in blacklist');
        }
        throw error;
    }
};

blacklistSchema.statics.removeUrl = async function(url) {
    const result = await this.findOneAndDelete({ url: url.trim() });
    return !!result; 
};

blacklistSchema.statics.getAllUrls = async function() {
    return await this.find({}).select('url createdAt addedBy reason').sort({ createdAt: -1 });
};

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

module.exports = Blacklist;