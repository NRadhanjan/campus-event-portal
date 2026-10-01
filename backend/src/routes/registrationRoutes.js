const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const registrationController = require('../controllers/registrationController');

// All registration actions require authentication
router.use(authMiddleware);

router.post('/', registrationController.registerForEvent);
router.delete('/:id', registrationController.cancelRegistration);

module.exports = router;
