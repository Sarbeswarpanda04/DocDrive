const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { uploadFile, getSignedDownloadUrl, deleteFile, buildStorageKey } = require('../services/b2Storage');
const logger = require('../utils/logger');

/**
 * GET /files?folder_id=...
 */
const getFiles = async (req, res, next) => {
  try {
    const { folder_id } = req.query;

    const folderCondition = folder_id ? 'folder_id = $2' : 'folder_id IS NULL';
    const params = folder_id ? [req.user.id, folder_id] : [req.user.id];

    const result = await query(
      `SELECT id, folder_id, file_name, file_size, mime_type, is_starred, created_at
       FROM files WHERE user_id = $1 AND ${folderCondition}
       ORDER BY created_at DESC`,
      params
    );

    return res.json({ success: true, files: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /files/starred
 */
const getStarredFiles = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, folder_id, file_name, file_size, mime_type, is_starred, created_at
       FROM files WHERE user_id = $1 AND is_starred = TRUE
       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, files: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /files/recent
 */
const getRecentFiles = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, folder_id, file_name, file_size, mime_type, is_starred, created_at
       FROM files WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    return res.json({ success: true, files: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /files/:id/star
 * Toggle starred status
 */
const toggleStar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE files SET is_starred = NOT is_starred, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_starred`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    return res.json({ success: true, file: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /files/upload
 * Expects multer to populate req.file and checkQuota to have run
 */
const uploadFileHandler = async (req, res, next) => {
  let storageKey = null;
  try {
    const { folder_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // Verify folder ownership if provided
    if (folder_id) {
      const folderCheck = await query(
        'SELECT id FROM folders WHERE id = $1 AND user_id = $2',
        [folder_id, req.user.id]
      );
      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }
    }

    const fileId = uuidv4();
    storageKey = buildStorageKey(req.user.id, folder_id || null, fileId, file.originalname);

    // Upload to R2
    await uploadFile(storageKey, file.buffer, file.mimetype);

    // Save metadata to DB
    const result = await query(
      `INSERT INTO files (id, user_id, folder_id, file_name, file_size, mime_type, storage_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, folder_id, file_name, file_size, mime_type, created_at`,
      [fileId, req.user.id, folder_id || null, file.originalname, file.size, file.mimetype, storageKey]
    );

    // Update storage_used
    await query(
      'UPDATE users SET storage_used = storage_used + $1 WHERE id = $2',
      [file.size, req.user.id]
    );

    logger.info(`File uploaded: ${fileId} by user ${req.user.id}`);
    return res.status(201).json({ success: true, file: result.rows[0] });
  } catch (error) {
    // If DB insert fails after R2 upload, try to clean up R2
    if (storageKey) {
      try { await deleteFile(storageKey); } catch (_) {}
    }
    next(error);
  }
};

/**
 * GET /files/:id/download
 * Returns a signed URL to download the file
 */
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, file_name, storage_key, mime_type FROM files WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = result.rows[0];
    const signedUrl = await getSignedDownloadUrl(file.storage_key);

    return res.json({
      success: true,
      url: signedUrl,
      file_name: file.file_name,
      mime_type: file.mime_type,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /files/:id
 * Rename a file
 */
const renameFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { file_name } = req.body;

    if (!file_name || file_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'File name is required' });
    }

    const result = await query(
      `UPDATE files SET file_name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, file_name`,
      [file_name.trim(), id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    return res.json({ success: true, file: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /files/:id
 */
const deleteFileHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, storage_key, file_size FROM files WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = result.rows[0];

    // Delete from R2
    await deleteFile(file.storage_key);

    // Delete from DB (shared_links cascade automatically)
    await query('DELETE FROM files WHERE id = $1', [id]);

    // Update storage_used
    await query(
      'UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2',
      [file.file_size, req.user.id]
    );

    logger.info(`File deleted: ${id} by user ${req.user.id}`);
    return res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /files/:id/share
 * Generate a shareable link
 */
const shareFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { expiresInHours } = req.body;

    const fileCheck = await query(
      'SELECT id, file_name FROM files WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const token = uuidv4();
    const expiresAt = expiresInHours
      ? new Date(Date.now() + parseInt(expiresInHours) * 60 * 60 * 1000)
      : null;

    const result = await query(
      `INSERT INTO shared_links (file_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, token, expires_at, created_at`,
      [id, token, expiresAt]
    );

    const shareLink = `${process.env.FRONTEND_URL}/share/${token}`;

    return res.status(201).json({
      success: true,
      link: shareLink,
      token: result.rows[0].token,
      expires_at: result.rows[0].expires_at,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFiles,
  getStarredFiles,
  getRecentFiles,
  toggleStar,
  uploadFileHandler,
  downloadFile,
  renameFile,
  deleteFileHandler,
  shareFile,
};
