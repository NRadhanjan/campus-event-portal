const db = require('../config/db');
const { getSecurityMode } = require('../config/securityMode');

const registrationController = {
  // POST /api/register
  registerForEvent: (req, res, next) => {
    try {
      const mode = getSecurityMode();
      const { eventId, userId: suppliedUserId } = req.body;

      if (!eventId) {
        return res.status(400).json({ error: 'eventId is required' });
      }

      // Check if event exists
      const event = db.prepare('SELECT id, capacity FROM events WHERE id = ?').get(Number(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check current capacity
      const regCount = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE eventId = ?').get(Number(eventId)).count;
      if (regCount >= event.capacity) {
        return res.status(400).json({ error: 'Event is at full capacity' });
      }

      // VULNERABLE VS DEFENDED USER ASSIGNMENT:
      // In VULNERABLE mode: Trusts client-supplied userId from req.body (allows spoofing registration for any user)
      // In DEFENDED mode: Strictly binds to verified req.user.id
      let targetUserId = req.user.id;
      if (mode === 'vulnerable' && suppliedUserId) {
        targetUserId = Number(suppliedUserId);
      }

      // Check if already registered
      const existing = db.prepare('SELECT id FROM registrations WHERE userId = ? AND eventId = ?').get(targetUserId, Number(eventId));
      if (existing) {
        return res.status(409).json({ error: 'User is already registered for this event' });
      }

      const insert = db.prepare('INSERT INTO registrations (userId, eventId) VALUES (?, ?)');
      const result = insert.run(targetUserId, Number(eventId));

      return res.status(201).json({
        message: 'Successfully registered for event',
        registrationId: Number(result.lastInsertRowid),
        registeredUserId: targetUserId,
        mode
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/register/:id (Target of IDOR ticket cancellation)
  cancelRegistration: (req, res, next) => {
    try {
      const mode = getSecurityMode();
      const registrationId = Number(req.params.id);

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registrationId);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      // DEFENDED CHECK: Ownership check
      if (mode === 'defended') {
        if (registration.userId !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Forbidden: You cannot cancel another student’s registration ticket.',
            code: 'ERR_IDOR_DELETION_BLOCKED',
            mode: 'defended'
          });
        }
      }

      // VULNERABLE: Deletes arbitrary registration record directly by ID without checking owner
      db.prepare('DELETE FROM registrations WHERE id = ?').run(registrationId);

      return res.json({
        message: mode === 'vulnerable'
          ? 'Registration cancelled (Vulnerable IDOR: deleted without verifying ownership)'
          : 'Registration successfully cancelled',
        deletedRegistrationId: registrationId,
        mode
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = registrationController;
