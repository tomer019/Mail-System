const { v4: uuidv4 } = require("uuid");

// key: userId (email), value: Map of labels: labelId => { id, name }
const labels = new Map();

// Ensure the user's label map exists
function getUserMap(userId) {
  if (!labels.has(userId)) {
    labels.set(userId, new Map());
  }
  return labels.get(userId);
}
// Functions to manage labels for a user
function getAllLabels(userId) {
  const userMap = getUserMap(userId);
  return Array.from(userMap.values());
}
// Get a label by its ID for a specific user
function getLabelById(userId, labelId) {
  const userMap = getUserMap(userId);
  return userMap.get(labelId) || null;
}
// Create a new label for a user
function createLabel(userId, name) {
  if (labelNameExists(userId, name)) {
    throw new Error(`Label with name "${name}" already exists`);
  }

  const userMap = getUserMap(userId);
  const id = uuidv4();
  const newLabel = { id, name };
  userMap.set(id, newLabel);
  return newLabel;
}
// Update an existing label for a user
function updateLabel(userId, labelId, name) {
  const userMap = getUserMap(userId);
  if (!userMap.has(labelId)) return null;
  const updated = { id: labelId, name };
  userMap.set(labelId, updated);
  return updated;
}
// Delete a label for a user
function deleteLabel(userId, labelId) {
  const userMap = getUserMap(userId);
  return userMap.delete(labelId);
}
// Check if a label name already exists for a user
function labelNameExists(userId, name) {
  const userMap = getUserMap(userId);
  name = name.trim().toLowerCase();
  for (const label of userMap.values()) {
    if (label.name.trim().toLowerCase() === name) {
      return true;
    }
  }
  return false;
}

/**Add in exercises 4**/
// mailId → Set of labelIds per user
const mailLabels = new Map(); // key: userId, value: Map of mailId => Set of labelIds

// Ensure the user's mail label map exists, if it doesn't exist yet, creates it.
function ensureMailLabelMap(userId) {
  if (!mailLabels.has(userId)) {
    mailLabels.set(userId, new Map());
  }
  return mailLabels.get(userId);
}

// Assign label to mail
function addLabelToMail(userId, mailId, labelId) {
  const userMap = ensureMailLabelMap(userId);
  if (!userMap.has(mailId)) {
    userMap.set(mailId, new Set());
  }
  userMap.get(mailId).add(labelId);
}

// Remove label from mail
function removeLabelFromMail(userId, mailId, labelId) {
  const userMap = ensureMailLabelMap(userId);
  if (!userMap.has(mailId)) return false;
  return userMap.get(mailId).delete(labelId);
}

// Get labels for a specific mail
function getLabelsForMail(userId, mailId) {
  const userMap = ensureMailLabelMap(userId);
  return userMap.get(mailId) ? Array.from(userMap.get(mailId)) : [];
}
 //Get all mailIds for a given label
function getMailsByLabel(userId, labelId) {
  const result = [];
  const userMap = ensureMailLabelMap(userId);
  for (const [mailId, labelsSet] of userMap.entries()) {
    if (labelsSet.has(labelId)) {
      result.push(mailId);
    }
  }
  return result;
}

// Description: This module manages labels for users, allowing operations like creating, updating, deleting, and retrieving labels.
module.exports = {
  getUserMap,
  getAllLabels,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel,
  labelNameExists,
  addLabelToMail, //Add in exercises 4
  removeLabelFromMail, //Add in exercises 4
  getLabelsForMail, //Add in exercises 4
  getMailsByLabel //Add in exercises 4
};
