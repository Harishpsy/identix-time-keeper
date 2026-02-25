const express = require('express');
const { register, login, getMe, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/reset-password', authMiddleware, roleMiddleware('admin'), resetPassword);

module.exports = router;
