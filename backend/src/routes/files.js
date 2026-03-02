const express = require('express');
const router = express.Router();
const {
  getFiles,
  getStarredFiles,
  getRecentFiles,
  toggleStar,
  uploadFileHandler,
  downloadFile,
  renameFile,
  deleteFileHandler,
  shareFile,
} = require('../controllers/fileController');
const { listSharedLinks, revokeSharedLink } = require('../controllers/shareController');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const { checkQuota } = require('../middleware/quota');
const { uploadLimiter } = require('../middleware/rateLimit');

// All routes require auth
router.use(authenticate);

// Named routes must come before /:id param routes
router.get('/starred', getStarredFiles);
router.get('/recent', getRecentFiles);
router.get('/', getFiles);
router.post('/upload', uploadLimiter, upload.single('file'), handleMulterError, checkQuota, uploadFileHandler);
router.get('/:id/download', downloadFile);
router.patch('/:id/star', toggleStar);
router.patch('/:id', renameFile);
router.delete('/:id', deleteFileHandler);
router.post('/:id/share', shareFile);
router.get('/:id/shares', listSharedLinks);
router.delete('/:id/shares/:shareId', revokeSharedLink);

module.exports = router;
