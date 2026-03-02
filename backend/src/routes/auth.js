const express = require('express');
const router = express.Router();
const { register, loginWithFace, loginWithMpin, logout, getMe, changeMpin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, register);
router.post('/login/face', authLimiter, loginWithFace);
router.post('/login/mpin', authLimiter, loginWithMpin);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/change-mpin', authenticate, changeMpin);

module.exports = router;
