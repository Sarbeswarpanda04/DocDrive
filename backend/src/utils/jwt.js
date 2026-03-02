const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

/**
 * Signs a JWT token with user payload
 * @param {object} payload - { id, name, role }
 * @returns {string} signed JWT token
 */
const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'docdrive',
    audience: 'docdrive-users',
  });
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'docdrive',
    audience: 'docdrive-users',
  });
};

module.exports = { signToken, verifyToken };
