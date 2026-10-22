const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'change-me-in-production';
const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

function generateToken(payload) {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken,
};
