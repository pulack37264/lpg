const { verifyToken } = require('../auth');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication token is missing.' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token.' });
  }
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, error: 'Insufficient permission.' });
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorizeRole,
};
