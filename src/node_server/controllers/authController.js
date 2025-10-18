const jwt = require('jsonwebtoken'); // Load the JWT library to generate and verify tokens
const SECRET_KEY = 'my_secret_key';  // Secret key used to sign the token (should be stored in environment variables in production)
const userModel = require('../models/userModel');
const { hashPassword } = require('../utils/cryptoUtil');
const inboxMap = require('../utils/inboxMap');

// This controller handles user authentication, including registration and login.
// Handle user registration, including optional profile image
function register(req, res) {
  const {
    firstName,
    lastName,
    password,
    email,
    birthDate,
    phone,
    gender,
  } = req.body;

  // Get uploaded image filename from multer, if exists
  /*******************
   * to use the image diractly from the client, the following line was changed by Meir.
   * The original line was:
   * const profileImage = req.file ? req.file.filename : null;
  */
  const profileImage = req.body.profilePicture || null;

  // Validate required fields
  if (!firstName || !lastName || !password || !email) {
    return res.status(400).send('Missing required fields');
  }

  // Check if email is already used
  if (userModel.findUserByEmail(email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Hash the password before storing
  const hashedPassword = hashPassword(password);

  // Create the user in the in-memory model
  const newUser = userModel.createUser(
    firstName,
    lastName,
    hashedPassword,
    email,
    birthDate,
    phone,
    gender,
    profileImage
  );
  inboxMap.set(newUser.email, []); // Store the user's inbox in the in-memory map
  require('../models/labels').createLabel(newUser.email, "Spam"); // Added by Meir in ex4: Initialize the "Spam" label for the user
  // Return safe fields only
  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    name: `${newUser.firstName} ${newUser.lastName}`,
    profileImage: newUser.profileImage
  });
}

// Handle user login and issue a JWT token
function login(req, res) {
  const { email, password } = req.body; // Extract email and password from the request body

  // Validate that both fields are present
  if (!email || !password) {
    return res.status(400).send("Missing email or password"); // Bad request if any field is missing
  }

  // Try to find the user by email in the in-memory user model
  const user = userModel.findUserByEmail(email);

  // Check if the user exists and password matches the stored (hashed) password
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });

  }

  // Create a signed JWT token with user's ID and email as payload
  const token = jwt.sign(
    { userId: user.id, email: user.email }, // Payload that will be encoded into the token
    SECRET_KEY,                            // Secret used to digitally sign the token
    { expiresIn: '1h' }                    // Token will expire in 1 hour
  );

  // Respond with the token and its expiration time in seconds
  return res.status(200).json({
    token,         // The generated JWT token
    expiresIn: 3600 // Expiration time in seconds (1 hour)
  });

}

function getCurrentUser(req, res) { // Added by Meir in exercise 4
  // This function retrieves the current user's information based on the JWT token
  const userId = req.user.userId; 

  const user = userModel.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImage: user.profileImage || null
  });
}

module.exports = {
  login,
  register,
  getCurrentUser // Added by Meir in exercise 4
}