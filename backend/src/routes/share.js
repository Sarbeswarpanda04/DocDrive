const express = require('express');
const router = express.Router();
const { accessSharedFile } = require('../controllers/shareController');

// Public endpoint — no auth required
router.get('/:token', accessSharedFile);

module.exports = router;
