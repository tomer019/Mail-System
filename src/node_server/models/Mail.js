const mongoose = require('mongoose');

const mailSchema = new mongoose.Schema({
    // Unique identifier for the mail
    mailId: {
        type: String,
        required: true,
        unique: true
    },

    // Email addresses
    sender: {
        type: String,
        required: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },

    recipient: {
        type: String,
        required: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },

    // Array of all recipients (for group emails)
    recipients: [{
        type: String,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    }],

    // Mail content
    subject: {
        type: String,
        default: ''
    },

    content: {
        type: String,
        default: ''
    },

    // Labels per user - using array of objects instead of Map
    labels: [{
        userEmail: {
            type: String,
            required: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        },
        labelIds: [{
            type: String
        }]
    }],

    // Group ID for threading related emails
    groupId: {
        type: String,
        required: true
    },

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now
    },

    // Soft delete flag (instead of actually deleting)
    isDeleted: {
        type: Boolean,
        default: false
    },
    isDraft: {
    type: Boolean,
    default: false
    },

    // Track which users have deleted this mail
    deletedBy: [{
        type: String,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    }]
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better performance
mailSchema.index({ sender: 1, timestamp: -1 });
mailSchema.index({ recipient: 1, timestamp: -1 });
mailSchema.index({ groupId: 1 });
mailSchema.index({ mailId: 1 });
mailSchema.index({ 'labels.userEmail': 1 });

// Instance methods
mailSchema.methods.isAccessibleBy = function (userEmail) {
    return this.sender === userEmail ||
        this.recipient === userEmail ||
        (this.recipients && this.recipients.includes(userEmail));
};

mailSchema.methods.isDeletedBy = function (userEmail) {
    return this.deletedBy.includes(userEmail);
};

// Static methods
mailSchema.statics.findByUser = function (userEmail, options = {}) {
    const query = {
        $or: [
            { sender: userEmail },
            { recipient: userEmail },
            { recipients: userEmail }
        ],
        deletedBy: { $ne: userEmail }
    };

    return this.find(query, null, options).sort({ timestamp: -1 });
};


mailSchema.statics.findInboxByUser = function (userEmail, options = {}) {
    const query = {
        'labels': {
            $elemMatch: {
                'userEmail': userEmail,
                'labelIds': 'inbox'
            }
        },
        deletedBy: { $ne: userEmail },
    };

    return this.find(query, null, options).sort({ timestamp: -1 });
};

mailSchema.statics.findSentByUser = function (userEmail, options = {}) {
    const query = {
        'labels': {
            $elemMatch: {
                'userEmail': userEmail,
                'labelIds': 'sent'
            }
        },
        deletedBy: { $ne: userEmail },
    };

    return this.find(query, null, options).sort({ timestamp: -1 });
};

mailSchema.statics.findDraftsByUser = function (userEmail, options = {}) {
    const query = {
        'labels': {
            $elemMatch: {
                'userEmail': userEmail,
                'labelIds': 'drafts'
            }
        },
        deletedBy: { $ne: userEmail }
    };
    return this.find(query, null, options).sort({ timestamp: -1 });
};
const Mail = mongoose.model('Mail', mailSchema);

module.exports = Mail;