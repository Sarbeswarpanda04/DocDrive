const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { encryptEmbedding, decryptEmbedding, cosineSimilarity, FACE_MATCH_THRESHOLD } = require('../utils/encryption');
const { signToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const MAX_FAILED_ATTEMPTS = 5;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
  maxAge: 30 * 60 * 1000, // 30 minutes
};

/**
 * POST /auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, mpin, faceEmbedding } = req.body;

    if (!name || !mpin || !faceEmbedding) {
      return res.status(400).json({ success: false, message: 'Name, MPIN, and face data are required' });
    }

    if (!/^\d{4}$/.test(mpin)) {
      return res.status(400).json({ success: false, message: 'MPIN must be exactly 4 digits' });
    }

    if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
      return res.status(400).json({ success: false, message: 'Invalid face embedding (must be 128D vector)' });
    }

    const [mpinHash, encryptedEmbedding] = await Promise.all([
      bcrypt.hash(mpin, BCRYPT_ROUNDS),
      Promise.resolve(encryptEmbedding(faceEmbedding)),
    ]);

    const result = await query(
      `INSERT INTO users (name, face_embedding_encrypted, mpin_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, role, storage_quota, storage_used, created_at`,
      [name.trim(), encryptedEmbedding, mpinHash]
    );

    const user = result.rows[0];
    const token = signToken({ id: user.id, name: user.name, role: user.role });

    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info(`New user registered: ${user.id}`);
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        storage_quota: Number(user.storage_quota),
        storage_used: Number(user.storage_used),
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A user with this name already exists' });
    }
    next(error);
  }
};

/**
 * POST /auth/login/face
 */
const loginWithFace = async (req, res, next) => {
  try {
    const { name, faceEmbedding } = req.body;

    if (!name || !faceEmbedding) {
      return res.status(400).json({ success: false, message: 'Name and face data are required' });
    }

    if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
      return res.status(400).json({ success: false, message: 'Invalid face embedding' });
    }

    const result = await query(
      `SELECT id, name, role, face_embedding_encrypted, failed_attempts,
              account_locked, account_disabled, storage_quota, storage_used
       FROM users WHERE name = $1 AND role = 'user'`,
      [name.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.account_disabled) {
      return res.status(403).json({ success: false, message: 'Account has been disabled' });
    }

    if (user.account_locked) {
      return res.status(403).json({ success: false, message: 'Account is locked. Please use MPIN reset or contact support.' });
    }

    const storedEmbedding = decryptEmbedding(user.face_embedding_encrypted);
    const similarity = cosineSimilarity(faceEmbedding, storedEmbedding);

    if (similarity < FACE_MATCH_THRESHOLD) {
      await incrementFailedAttempts(user.id, user.failed_attempts);
      await logLogin(user.id, 'face', false, req);
      return res.status(401).json({ success: false, message: 'Face verification failed' });
    }

    await query('UPDATE users SET failed_attempts = 0 WHERE id = $1', [user.id]);
    await logLogin(user.id, 'face', true, req);

    const token = signToken({ id: user.id, name: user.name, role: user.role });
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        storage_quota: Number(user.storage_quota),
        storage_used: Number(user.storage_used),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login/mpin
 */
const loginWithMpin = async (req, res, next) => {
  try {
    const { name, mpin } = req.body;

    if (!name || !mpin) {
      return res.status(400).json({ success: false, message: 'Name and MPIN are required' });
    }

    const result = await query(
      `SELECT id, name, role, mpin_hash, failed_attempts,
              account_locked, account_disabled, storage_quota, storage_used
       FROM users WHERE name = $1`,
      [name.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.account_disabled) {
      return res.status(403).json({ success: false, message: 'Account has been disabled' });
    }

    if (user.account_locked) {
      return res.status(403).json({ success: false, message: 'Account locked after 5 failed attempts. Contact support.' });
    }

    const isValid = await bcrypt.compare(mpin, user.mpin_hash);

    if (!isValid) {
      await incrementFailedAttempts(user.id, user.failed_attempts);
      await logLogin(user.id, 'mpin', false, req);
      const remaining = MAX_FAILED_ATTEMPTS - (user.failed_attempts + 1);
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Account locked.'}`,
      });
    }

    await query('UPDATE users SET failed_attempts = 0 WHERE id = $1', [user.id]);
    await logLogin(user.id, 'mpin', true, req);

    const token = signToken({ id: user.id, name: user.name, role: user.role });
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        storage_quota: Number(user.storage_quota),
        storage_used: Number(user.storage_used),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  return res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * GET /auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, role, storage_quota, storage_used, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    return res.json({
      success: true,
      user: {
        ...user,
        storage_quota: Number(user.storage_quota),
        storage_used: Number(user.storage_used),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /auth/change-mpin
 */
const changeMpin = async (req, res, next) => {
  try {
    const { currentMpin, newMpin } = req.body;

    if (!currentMpin || !newMpin) {
      return res.status(400).json({ success: false, message: 'Current and new MPIN are required' });
    }

    if (!/^\d{4}$/.test(newMpin)) {
      return res.status(400).json({ success: false, message: 'New MPIN must be exactly 4 digits' });
    }

    const result = await query('SELECT mpin_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentMpin, result.rows[0].mpin_hash);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current MPIN is incorrect' });
    }

    const newHash = await bcrypt.hash(newMpin, BCRYPT_ROUNDS);
    await query('UPDATE users SET mpin_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    return res.json({ success: true, message: 'MPIN updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const incrementFailedAttempts = async (userId, currentAttempts) => {
  const newAttempts = currentAttempts + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
  await query(
    'UPDATE users SET failed_attempts = $1, account_locked = $2 WHERE id = $3',
    [newAttempts, shouldLock, userId]
  );
};

const logLogin = async (userId, method, success, req) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'] || '';
    await query(
      `INSERT INTO login_history (user_id, method, success, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, method, success, ip, ua]
    );
  } catch (_) {
    // Non-critical — don't fail login if logging fails
  }
};

module.exports = { register, loginWithFace, loginWithMpin, logout, getMe, changeMpin };
