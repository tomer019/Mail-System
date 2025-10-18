const users = []; // In-memory array to store all registered users
let nextId = 1; // Simple counter to assign unique user IDs

// Create a new user and add them to the users array
function createUser(firstName, lastName, password, email, birthDate = null, phone = null, gender = null, profileImage = null) {
  const user = {
    id: nextId++,
    firstName,
    lastName,
    password,
    email,
    birthDate, // optional
    phone,     // optional
    gender,     // optional
    profileImage     // optional

  };
  users.push(user); // Add user to in-memory storage
  return user; // Return the newly created user
}

// Find a user by their first name
function findUserByName(firstName) {
  return users.find(u => u.firstName === firstName); // Return the user object if name matches
}

// Find a user by their last name
function findUserByLastName(lastName) {
  return users.find(u => u.lastName === lastName); // Return the user object if name matches
}


// Find a user by their ID
function findUserById(id) {
  return users.find(u => u.id === id); // Return the user object if ID matches
}

// Find user by email (assuming it's unique)
function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function updateUser(id, updatedFields) {
  const user = findUserById(id);
  if (!user) return null;
  Object.assign(user, updatedFields);
  return user;
}
// Delete a user by ID
function deleteUser(id) {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users.splice(index, 1);
    return true;
  }
  return false;
}



// Export functions for use in other files (e.g., controllers)
module.exports = {
  createUser,
  findUserByName,
  findUserById,
  findUserByLastName,
  findUserByEmail,
  updateUser,
  deleteUser
};
