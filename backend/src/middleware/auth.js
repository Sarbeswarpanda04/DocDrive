const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verifies JWT from HttpOnly cookie and attaches user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }

    const result = await query(
      'SELECT id, name, role, account_disabled, account_locked FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.account_disabled) {
      return res.status(403).json({ success: false, message: 'Account has been disabled' });
    }

    if (user.account_locked) {
      return res.status(403).json({ success: false, message: 'Account is locked. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

/**
 * Requires admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
