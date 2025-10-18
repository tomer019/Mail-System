const express = require('express');
const router = express.Router(); // Create a router object to define API routes

const authController = require('../controllers/authController'); // Controller with register & login logic
const authenticateToken = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure multer to save uploaded files to 'uploads/' directory

// Register route (with optional profile image upload)
router.post('/register', upload.single('profilePicture'), authController.register);
// Login route (issues JWT token)
router.post('/login', authController.login);
router.get("/me", authenticateToken, authController.getCurrentUser); // Get current user profile (protected route)
router.get('/avatar-by-email/:email', authController.getAvatarByEmail);//for the pictures
router.get('/avatar/:userId', authController.getAvatar);


module.exports = router;