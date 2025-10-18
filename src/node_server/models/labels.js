// models/Label.js - MongoDB Label Model
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const labelSchema = new mongoose.Schema({
    // Use custom labelId instead of MongoDB _id for compatibility
    labelId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4()
    },
    
    // User who owns this label (email address)
    userId: {
        type: String,
        required: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        index: true
    },
    
    // Label name
    name: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound index to ensure unique label names per user
labelSchema.index({ userId: 1, name: 1 }, { unique: true });

// Instance methods
labelSchema.methods.toJSON = function() {
    return {
        id: this.labelId,
        name: this.name,
        userId: this.userId,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

// Static methods for compatibility with existing controller
labelSchema.statics.getAllLabelsForUser = function(userId) {
    return this.find({ userId }).select('labelId name createdAt updatedAt');
};

labelSchema.statics.getLabelById = function(userId, labelId) {
    return this.findOne({ userId, labelId }).select('labelId name createdAt updatedAt');
};

labelSchema.statics.createLabelForUser = function(userId, name) {
    const label = new this({
        userId,
        name: name.trim(),
        labelId: uuidv4()
    });
    return label.save();
};

labelSchema.statics.updateLabelForUser = function(userId, labelId, name) {
    return this.findOneAndUpdate(
        { userId, labelId },
        { name: name.trim(), updatedAt: new Date() },
        { new: true, select: 'labelId name createdAt updatedAt' }
    );
};

labelSchema.statics.deleteLabelForUser = function(userId, labelId) {
    return this.findOneAndDelete({ userId, labelId });
};

labelSchema.statics.searchLabelsForUser = function(userId, query) {
    return this.find({
        userId,
        name: { $regex: query, $options: 'i' }
    }).select('labelId name createdAt updatedAt');
};

// Mail-Label association schema (embedded in Mail model, but keeping for reference)
const mailLabelSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        index: true
    },
    
    mailId: {
        type: String,
        required: true,
        index: true
    },
    
    labelId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
mailLabelSchema.index({ userId: 1, mailId: 1 });
mailLabelSchema.index({ userId: 1, labelId: 1 });

// Static methods for mail-label operations
mailLabelSchema.statics.addLabelToMail = async function(userId, mailId, labelId) {
    // Use upsert to avoid duplicates
    return this.findOneAndUpdate(
        { userId, mailId, labelId },
        { userId, mailId, labelId },
        { upsert: true, new: true }
    );
};

mailLabelSchema.statics.removeLabelFromMail = function(userId, mailId, labelId) {
    return this.findOneAndDelete({ userId, mailId, labelId });
};

mailLabelSchema.statics.getLabelsForMail = function(userId, mailId) {
    return this.find({ userId, mailId }).select('labelId');
};

mailLabelSchema.statics.getMailsByLabel = function(userId, labelId) {
    return this.find({ userId, labelId }).select('mailId');
};

const Label = mongoose.model('Label', labelSchema);
const MailLabel = mongoose.model('MailLabel', mailLabelSchema);

module.exports = {
    Label,
    MailLabel
};