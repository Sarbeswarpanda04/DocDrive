const { query } = require('../config/database');

/**
 * GET /folders
 * Returns all folders for current user
 */
const getFolders = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, parent_folder_id, folder_name, created_at
       FROM folders WHERE user_id = $1 ORDER BY folder_name ASC`,
      [req.user.id]
    );
    return res.json({ success: true, folders: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /folders
 * Create a new folder
 */
const createFolder = async (req, res, next) => {
  try {
    const { folder_name, parent_folder_id } = req.body;

    if (!folder_name || folder_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    if (folder_name.length > 255) {
      return res.status(400).json({ success: false, message: 'Folder name too long (max 255 chars)' });
    }

    // If parent, verify it belongs to user
    if (parent_folder_id) {
      const parentCheck = await query(
        'SELECT id FROM folders WHERE id = $1 AND user_id = $2',
        [parent_folder_id, req.user.id]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Parent folder not found' });
      }
    }

    const result = await query(
      `INSERT INTO folders (user_id, parent_folder_id, folder_name)
       VALUES ($1, $2, $3)
       RETURNING id, parent_folder_id, folder_name, created_at`,
      [req.user.id, parent_folder_id || null, folder_name.trim()]
    );

    return res.status(201).json({ success: true, folder: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A folder with this name already exists here' });
    }
    next(error);
  }
};

/**
 * PATCH /folders/:id
 * Rename a folder
 */
const renameFolder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { folder_name } = req.body;

    if (!folder_name || folder_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const result = await query(
      `UPDATE folders SET folder_name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, folder_name`,
      [folder_name.trim(), id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    return res.json({ success: true, folder: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /folders/:id
 * Delete a folder and cascade-delete files/subfolders
 */
const deleteFolder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    return res.json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFolders, createFolder, renameFolder, deleteFolder };
