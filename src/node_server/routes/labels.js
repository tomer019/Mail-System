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

/**Add in exercises 4**/
// Assign a label to a specific mail
router.post('/tag', authenticateToken, labelsController.tagMail);
// Remove a label from a specific mail
router.post('/untag', authenticateToken, labelsController.untagMail);
// Get all labels for a specific mail
router.get('/mail/:mailId', authenticateToken, labelsController.getLabelsForMail);
// Get all mail IDs associated with a specific label
router.get('/by-label/:labelId', authenticateToken, labelsController.getMailsByLabel);


module.exports = router;

