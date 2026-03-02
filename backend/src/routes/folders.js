const express = require('express');
const router = express.Router();
const { getFolders, createFolder, renameFolder, deleteFolder } = require('../controllers/folderController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getFolders);
router.post('/', createFolder);
router.patch('/:id', renameFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
