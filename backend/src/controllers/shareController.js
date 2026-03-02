const { query } = require('../config/database');
const { getSignedDownloadUrl } = require('../services/b2Storage');

/**
 * GET /share/:token
 * Public endpoint — validates token and returns a signed download URL
 */
const accessSharedFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await query(
      `SELECT sl.id, sl.expires_at, sl.file_id,
              f.file_name, f.storage_key, f.mime_type, f.file_size
       FROM shared_links sl
       JOIN files f ON f.id = sl.file_id
       WHERE sl.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shared link not found or expired' });
    }

    const link = result.rows[0];

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This link has expired' });
    }

    const signedUrl = await getSignedDownloadUrl(link.storage_key);

    return res.json({
      success: true,
      file_name: link.file_name,
      mime_type: link.mime_type,
      file_size: Number(link.file_size),
      url: signedUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /files/:id/share/:shareId
 * Revoke a shared link
 */
const revokeSharedLink = async (req, res, next) => {
  try {
    const { id: fileId, shareId } = req.params;

    // Ensure file belongs to user
    const fileCheck = await query(
      'SELECT id FROM files WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const result = await query(
      'DELETE FROM shared_links WHERE id = $1 AND file_id = $2 RETURNING id',
      [shareId, fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Share link not found' });
    }

    return res.json({ success: true, message: 'Share link revoked' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /files/:id/shares
 * List all share links for a file
 */
const listSharedLinks = async (req, res, next) => {
  try {
    const { id: fileId } = req.params;

    const fileCheck = await query(
      'SELECT id FROM files WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const result = await query(
      'SELECT id, token, expires_at, created_at FROM shared_links WHERE file_id = $1 ORDER BY created_at DESC',
      [fileId]
    );

    return res.json({
      success: true,
      links: result.rows.map((l) => ({
        ...l,
        url: `${process.env.FRONTEND_URL}/share/${l.token}`,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { accessSharedFile, revokeSharedLink, listSharedLinks };
