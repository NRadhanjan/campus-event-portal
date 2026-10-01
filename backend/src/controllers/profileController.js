const db = require('../config/db');
const { getSecurityMode } = require('../config/securityMode');

const profileController = {
  // GET /api/profile (Own profile)
  getOwnProfile: (req, res, next) => {
    try {
      const user = db.prepare('SELECT id, name, email, studentId, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch user's registered events
      const registrations = db.prepare(`
        SELECT r.id as registrationId, r.registeredAt, e.id as eventId, e.title, e.date, e.venue, e.category
        FROM registrations r
        JOIN events e ON r.eventId = e.id
        WHERE r.userId = ?
      `).all(req.user.id);

      return res.json({
        profile: user,
        registrations
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/profile/:id (Target of IDOR attack - CVE-2024-25635)
  getProfileById: (req, res, next) => {
    try {
      const requestedId = Number(req.params.id);
      const mode = getSecurityMode();

      // IN DEFENDED MODE: Strictly verify that requesting user owns this ID or is Admin
      if (mode === 'defended') {
        if (req.user.id !== requestedId && req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Forbidden: Access denied. You are not authorized to view another user’s profile.',
            code: 'ERR_IDOR_PREVENTED',
            mode: 'defended'
          });
        }
      }

      // IN VULNERABLE MODE: No ownership check! Allows any logged-in user to exfiltrate any other user's PII
      const user = db.prepare('SELECT id, name, email, studentId, phone, role, created_at FROM users WHERE id = ?').get(requestedId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const registrations = db.prepare(`
        SELECT r.id as registrationId, r.registeredAt, e.id as eventId, e.title, e.date, e.venue, e.category
        FROM registrations r
        JOIN events e ON r.eventId = e.id
        WHERE r.userId = ?
      `).all(requestedId);

      return res.json({
        message: mode === 'vulnerable' ? 'Vulnerable IDOR: Arbitrary profile data retrieved without ownership verification' : 'Profile retrieved',
        mode,
        profile: user,
        registrations
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/profile (Update PII)
  updateProfile: (req, res, next) => {
    try {
      const { name, phone } = req.body;
      const update = db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?');
      update.run(name || null, phone || null, req.user.id);

      const updatedUser = db.prepare('SELECT id, name, email, studentId, phone, role FROM users WHERE id = ?').get(req.user.id);
      return res.json({
        message: 'Profile updated successfully',
        profile: updatedUser
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = profileController;
