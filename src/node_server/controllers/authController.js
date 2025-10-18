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
  const profileImage = req.file ? req.file.filename : null;

  // Validate required fields
  if (!firstName || !lastName || !password || !email) {
    return res.status(400).send('Missing required fields');
  }

  // Check if email is already used
  if (userModel.findUserByEmail(email)) {
    return res.status(400).send('Email already registered');
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
  inboxMap.set(newUser.email, []);
  // Store the user's inbox in the in-memory map

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
    return res.status(401).send("Invalid email or password"); // Unauthorized if credentials are incorrect
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

function getProfile(req, res) {
  const userId = Number(req.params.id); // Get user ID from the request parameters
  const user = userModel.findUserById(userId); // Find the user by ID in the in-memory model

  if (!user) {
    return res.status(404).send("User not found"); // Return 404 if user does not exist
  }

  // Return safe fields only
  res.status(200).json({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    profileImage: user.profileImage
  });
}

module.exports = {
  login,
  register,
  getProfile
}