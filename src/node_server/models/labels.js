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

// Description: This module manages labels for users, allowing operations like creating, updating, deleting, and retrieving labels.
module.exports = {
  getUserMap,
  getAllLabels,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel,
  labelNameExists,
};
