const { query } = require('../config/database');

/**
 * Middleware to check if user has enough quota before upload
 * Expects req.user to be set and req.file to be populated (after multer)
 */
const checkQuota = async (req, res, next) => {
  try {
    const fileSize = req.file ? req.file.size : 0;
    if (fileSize === 0) return next();

    const result = await query(
      'SELECT storage_used, storage_quota FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { storage_used, storage_quota } = result.rows[0];

    if (BigInt(storage_used) + BigInt(fileSize) > BigInt(storage_quota)) {
      return res.status(413).json({
        success: false,
        message: 'Storage quota exceeded. Please free up space or contact admin.',
        storage: {
          used: Number(storage_used),
          quota: Number(storage_quota),
          fileSize,
        },
      });
    }

    req.storageInfo = {
      used: Number(storage_used),
      quota: Number(storage_quota),
      fileSize,
    };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkQuota };
