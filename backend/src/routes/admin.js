const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserQuota,
  toggleUserDisabled,
  unlockUser,
  getAnalytics,
  getAdminLogs,
  setupAdmin,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Bootstrap route — requires ADMIN_SETUP_KEY in body, no admin role needed
router.post('/setup', authenticate, setupAdmin);

// All remaining admin routes require auth + admin role
router.use(authenticate, requireAdmin);

router.get('/users', getAllUsers);
router.patch('/users/:id/quota', updateUserQuota);
router.patch('/users/:id/toggle-disable', toggleUserDisabled);
router.patch('/users/:id/unlock', unlockUser);
router.get('/analytics', getAnalytics);
router.get('/logs', getAdminLogs);

module.exports = router;
