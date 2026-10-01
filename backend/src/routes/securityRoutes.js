const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/status', authController.getSecurityStatus);
router.post('/toggle', authController.toggleSecurityMode);

module.exports = router;
