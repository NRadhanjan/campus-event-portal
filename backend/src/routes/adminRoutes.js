const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');

// All admin routes require base authentication, then RBAC
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/users', adminController.getAllUsers); // PII Dump target
router.post('/events', eventController.createEvent); // Unauthorized event creation target

module.exports = router;
