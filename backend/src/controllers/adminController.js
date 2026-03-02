const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.role, u.storage_quota,
              u.failed_attempts, u.account_locked, u.account_disabled, u.created_at,
              COUNT(f.id) AS file_count,
              COALESCE(SUM(f.file_size), 0) AS storage_used
       FROM users u
       LEFT JOIN files f ON f.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    return res.json({
      success: true,
      users: result.rows.map((u) => ({
        ...u,
        storage_quota: Number(u.storage_quota),
        storage_used: Number(u.storage_used),
        file_count: parseInt(u.file_count),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/users/:id/quota
 * Set a specific user's storage quota
 */
const updateUserQuota = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quota_bytes } = req.body;

    if (!quota_bytes || isNaN(quota_bytes) || Number(quota_bytes) < 0) {
      return res.status(400).json({ success: false, message: 'Valid quota_bytes is required' });
    }

    const result = await query(
      `UPDATE users SET storage_quota = $1
       WHERE id = $2
       RETURNING id, name, storage_quota, storage_used`,
      [quota_bytes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAdminAction(req.user.id, 'UPDATE_QUOTA', id, {
      new_quota: quota_bytes,
    });

    return res.json({
      success: true,
      user: {
        ...result.rows[0],
        storage_quota: Number(result.rows[0].storage_quota),
        storage_used: Number(result.rows[0].storage_used),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/users/:id/toggle-disable
 * Enable or disable a user account
 */
const toggleUserDisabled = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from disabling themselves
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot disable your own account' });
    }

    const current = await query(
      `SELECT id, account_disabled, role FROM users WHERE id = $1`,
      [id]
    );

    if (current.rows.length > 0 && current.rows[0].role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot disable an admin account' });
    }

    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newState = !current.rows[0].account_disabled;

    await query('UPDATE users SET account_disabled = $1 WHERE id = $2', [newState, id]);

    await logAdminAction(req.user.id, newState ? 'DISABLE_USER' : 'ENABLE_USER', id, {});

    return res.json({
      success: true,
      message: `User account ${newState ? 'disabled' : 'enabled'}`,
      account_disabled: newState,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/users/:id/unlock
 * Unlock a locked account
 */
const unlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE users SET account_locked = FALSE, failed_attempts = 0
       WHERE id = $1
       RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAdminAction(req.user.id, 'UNLOCK_USER', id, {});

    return res.json({ success: true, message: 'User account unlocked' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalUsersResult,
      actualStorageResult,
      totalQuotaResult,
      lockedResult,
      disabledResult,
      perUserResult,
      totalFilesResult,
      totalFoldersResult,
      newUsersResult,
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM users`),
      // Compute real storage from actual files (not the tracked column which may be stale)
      query(`SELECT COALESCE(SUM(file_size), 0) AS total_used FROM files`),
      query(`SELECT COALESCE(SUM(storage_quota), 0) AS total_quota FROM users`),
      query(`SELECT COUNT(*) FROM users WHERE account_locked = TRUE`),
      query(`SELECT COUNT(*) FROM users WHERE account_disabled = TRUE`),
      // Per-user storage from actual files
      query(
        `SELECT u.id, u.name, u.storage_quota,
                COALESCE(SUM(f.file_size), 0) AS storage_used
         FROM users u
         LEFT JOIN files f ON f.user_id = u.id
         GROUP BY u.id, u.name, u.storage_quota
         ORDER BY storage_used DESC LIMIT 20`
      ),
      query(`SELECT COUNT(*) FROM files`),
      query(`SELECT COUNT(*) FROM folders`),
      query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`),
    ]);

    return res.json({
      success: true,
      analytics: {
        total_users: parseInt(totalUsersResult.rows[0].count),
        total_storage_used: Number(actualStorageResult.rows[0].total_used),
        total_storage_quota: Number(totalQuotaResult.rows[0].total_quota),
        locked_accounts: parseInt(lockedResult.rows[0].count),
        disabled_accounts: parseInt(disabledResult.rows[0].count),
        total_files: parseInt(totalFilesResult.rows[0].count),
        total_folders: parseInt(totalFoldersResult.rows[0].count),
        new_users_7d: parseInt(newUsersResult.rows[0].count),
        top_users: perUserResult.rows.map((u) => ({
          ...u,
          storage_used: Number(u.storage_used),
          storage_quota: Number(u.storage_quota),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/users/:id
 */
const getUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [userResult, storageResult, folderCount, recentFiles] = await Promise.all([
      query(
        `SELECT id, name, role, storage_quota,
                failed_attempts, account_locked, account_disabled, created_at
         FROM users WHERE id = $1`,
        [id]
      ),
      // Compute real storage and file count from actual files
      query(
        `SELECT COUNT(*) AS file_count, COALESCE(SUM(file_size), 0) AS storage_used
         FROM files WHERE user_id = $1`,
        [id]
      ),
      query(`SELECT COUNT(*) FROM folders WHERE user_id = $1`, [id]),
      query(
        `SELECT id, file_name, file_size, mime_type, created_at
         FROM files WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 10`,
        [id]
      ),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u = userResult.rows[0];
    return res.json({
      success: true,
      user: {
        ...u,
        storage_quota: Number(u.storage_quota),
        storage_used: Number(storageResult.rows[0].storage_used),
        file_count: parseInt(storageResult.rows[0].file_count),
        folder_count: parseInt(folderCount.rows[0].count),
      },
      recent_files: recentFiles.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const checkRole = await query(`SELECT role FROM users WHERE id = $1`, [id]);
    if (checkRole.rows.length > 0 && checkRole.rows[0].role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete an admin account' });
    }

    const result = await query(
      `DELETE FROM users WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAdminAction(req.user.id, 'DELETE_USER', null, { deleted_user: result.rows[0].name });

    return res.json({ success: true, message: `User "${result.rows[0].name}" deleted` });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/logs
 */
const getAdminLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const action = req.query.action && req.query.action !== 'all' ? req.query.action : null;

    const params = action ? [limit, offset, action] : [limit, offset];
    const whereClause = action ? `WHERE al.action = $3` : '';

    const [result, countResult] = await Promise.all([
      query(
        `SELECT al.id, al.action, al.details, al.timestamp,
                u.name AS admin_name, tu.name AS target_user_name
         FROM admin_logs al
         JOIN users u ON u.id = al.admin_id
         LEFT JOIN users tu ON tu.id = al.target_user_id
         ${whereClause}
         ORDER BY al.timestamp DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        action
          ? `SELECT COUNT(*) FROM admin_logs WHERE action = $1`
          : `SELECT COUNT(*) FROM admin_logs`,
        action ? [action] : []
      ),
    ]);

    return res.json({
      success: true,
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /admin/setup
 * One-time admin account setup (requires ADMIN_SETUP_KEY)
 */
const setupAdmin = async (req, res, next) => {
  try {
    const { userId, adminSetupKey } = req.body;

    if (adminSetupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid admin setup key' });
    }

    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [userId]);

    return res.json({ success: true, message: 'User promoted to admin' });
  } catch (error) {
    next(error);
  }
};

// ─── Helper ─────────────────────────────────────────────────────────────────

const logAdminAction = async (adminId, action, targetUserId, details) => {
  try {
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, action, targetUserId || null, JSON.stringify(details)]
    );
  } catch (err) {
    logger.error('Failed to log admin action:', err);
  }
};

module.exports = {
  getAllUsers,
  updateUserQuota,
  toggleUserDisabled,
  unlockUser,
  getAnalytics,
  getAdminLogs,
  setupAdmin,
  getUserDetail,
  deleteUser,
};
