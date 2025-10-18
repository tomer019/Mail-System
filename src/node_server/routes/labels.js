// Description: Defines routes for handling label-related operations
const express = require('express');
const router = express.Router();
const labelsController = require('../controllers/labelsController');

// Import JWT authentication middleware
const authenticateToken = require('../middlewares/authMiddleware');

// Apply authentication middleware to all label routes
router.get('/search/:query', authenticateToken, labelsController.search);
router.get('/:id', authenticateToken, labelsController.getById);
router.patch('/:id', authenticateToken, labelsController.update);
router.delete('/:id', authenticateToken, labelsController.remove);
router.get('/', authenticateToken, labelsController.getAll);
router.post('/', authenticateToken, labelsController.create);


module.exports = router;

