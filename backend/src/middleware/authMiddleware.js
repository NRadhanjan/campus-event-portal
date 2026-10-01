const jwt = require('jsonwebtoken');
const { getSecurityMode, JWT_SECRET } = require('../config/securityMode');

const authMiddleware = (req, res, next) => {
  const mode = getSecurityMode();
  let token = null;

  // Mode check:
  // Vulnerable mode: Frontend stores token in localStorage and sends via Authorization header
  // Defended mode: Token sent via HttpOnly Cookie (or strict Bearer header)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. No token provided.',
      mode: mode
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, studentId, name }
    next();
  } catch (err) {
    if (mode === 'vulnerable') {
      return res.status(401).json({
        error: 'Invalid or expired token',
        debug: err.message,
        stack: err.stack
      });
    }
    return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
  }
};

module.exports = authMiddleware;
