const db = require('../config/db');

const adminController = {
  // GET /api/admin/users (Target for Vertical Privilege Escalation & PII dump)
  getAllUsers: (req, res, next) => {
    try {
      // Dumps full user registry (PII)
      const users = db.prepare(`
        SELECT u.id, u.name, u.email, u.studentId, u.phone, u.role, u.created_at,
               COUNT(r.id) as totalRegistrations
        FROM users u
        LEFT JOIN registrations r ON u.id = r.userId
        GROUP BY u.id
        ORDER BY u.id ASC
      `).all();

      return res.json({
        total: users.length,
        accessedBy: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        users
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
