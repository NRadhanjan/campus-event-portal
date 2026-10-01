const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

// All profile routes require authentication
router.use(authMiddleware);

router.get('/', profileController.getOwnProfile);
router.put('/', profileController.updateProfile);
router.get('/:id', profileController.getProfileById); // Target of IDOR

module.exports = router;
