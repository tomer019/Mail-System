// Description: Defines routes for handling mail-related operations
const express = require('express');
const router = express.Router();
const mailController = require('../controllers/mailController');

// Import JWT authentication middleware
const authenticateToken = require('../middlewares/authMiddleware');
router.get('/spam', authenticateToken, (req, res) => {
    req.params.label = 'spam';
    mailController.getMailsByLabel(req, res);
});
router.get('/starred', authenticateToken, (req, res) => {
    req.params.label = 'starred';
    mailController.getMailsByLabel(req, res);
});

// Apply authentication middleware to all mail routes
router.get('/search', authenticateToken, mailController.searchMails);
router.patch('/:id/label', authenticateToken, mailController.updateMailLabelsForUser);
router.patch('/:id/labels', authenticateToken, mailController.updateMailLabelsForUser); // for backward compatibility, also allow /labels endpoint. Added by Meir in exercise 4
router.get('/:id', authenticateToken, mailController.getMailById);
router.patch('/:id', authenticateToken, mailController.updateMail);


router.delete('/:id/permanent', authenticateToken, mailController.deleteMailByIdPermanently);
router.delete('/:id', authenticateToken, mailController.deleteMailById);

router.get('/', authenticateToken, mailController.getMails);
router.post('/', authenticateToken, mailController.createMail);
router.post('/drafts', authenticateToken, mailController.createDraft);
router.post('/drafts/:id/send', authenticateToken, mailController.sendDraft);
router.get('/drafts', authenticateToken, mailController.getDrafts);

router.post('/:id/archive', authenticateToken, mailController.archiveMail);
router.post('/:id/star', authenticateToken, mailController.toggleStarMail);
router.post('/:id/add-label', authenticateToken, mailController.addLabelToMail);
router.post('/:id/remove-label', authenticateToken, mailController.removeLabelFromMail);

router.get('/label/:label', authenticateToken, mailController.getMailsByLabel);

module.exports = router;