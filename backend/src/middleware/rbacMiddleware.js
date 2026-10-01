const { getSecurityMode } = require('../config/securityMode');

/**
 * RBAC Middleware for TB5 Admin Zone
 * In VULNERABLE mode: Either skips role validation or trusts client-controllable headers/body,
 * leading to Vertical Privilege Escalation (CVE-2020-5244, CVE-2026-26265).
 * In DEFENDED mode: Strictly verifies req.user.role === 'admin' from verified JWT claims.
 */
const requireAdmin = (req, res, next) => {
  const mode = getSecurityMode();

  if (mode === 'vulnerable') {
    // VULNERABILITY: Missing server-side role check!
    // The server assumes the frontend only navigated to /admin if allowed,
    // or trusts the request without verifying the JWT role claim.
    console.warn(`[WARN-VULNERABLE] Bypassing admin role check for user ID: ${req.user?.id || 'unknown'}`);
    return next();
  }

  // DEFENDED: Strict Role-Based Access Control (RBAC)
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access Denied: Administrative privileges required.',
      code: 'ERR_FORBIDDEN_ROLE',
      mode: 'defended'
    });
  }

  next();
};

module.exports = { requireAdmin };
