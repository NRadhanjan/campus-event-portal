const { getSecurityMode } = require('../config/securityMode');

/**
 * Centralized Error Handler
 * In VULNERABLE mode: Returns verbose stack trace, server file paths, aiding reconnaissance.
 * In DEFENDED mode: Returns a sanitized, generic error response.
 */
const errorHandler = (err, req, res, next) => {
  const mode = getSecurityMode();

  console.error('[SERVER-ERROR]', err);

  if (mode === 'vulnerable') {
    // Information Disclosure Vulnerability (CVE-2019-4751 / CVE-2024-43376)
    return res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
      requestPath: req.path,
      method: req.method,
      serverRuntime: `Node.js ${process.version}`,
      platform: process.platform,
      serverDir: __dirname,
      vulnerabilityNote: 'Verbose error disclosure active in vulnerable mode.'
    });
  }

  // Defended Mode: Sanitized response
  return res.status(err.status || 500).json({
    error: 'Internal Server Error. Please contact systems support.',
    referenceId: Date.now().toString(36)
  });
};

module.exports = errorHandler;
