// In-memory / persistent toggle for security mode
let currentMode = process.env.SECURITY_MODE || 'vulnerable'; // 'vulnerable' or 'defended'

const getSecurityMode = () => currentMode;

const setSecurityMode = (mode) => {
  if (mode === 'vulnerable' || mode === 'defended') {
    currentMode = mode;
    console.log(`[SECURITY-MODE-TOGGLE] Switched mode to: ${currentMode.toUpperCase()}`);
    return true;
  }
  return false;
};

module.exports = {
  getSecurityMode,
  setSecurityMode,
  JWT_SECRET: process.env.JWT_SECRET || 'campus-portal-super-secret-key-2026'
};
