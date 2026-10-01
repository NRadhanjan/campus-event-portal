const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { getSecurityMode, setSecurityMode, JWT_SECRET } = require('../config/securityMode');

const authController = {
  // POST /api/auth/signup
  signup: (req, res, next) => {
    try {
      const { name, email, password, studentId, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      // Check if user already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const role = 'student'; // Default role

      const insert = db.prepare(`
        INSERT INTO users (name, email, password, studentId, phone, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(name, email, hashedPassword, studentId || null, phone || null, role);

      const user = {
        id: Number(result.lastInsertRowid),
        name,
        email,
        studentId: studentId || null,
        phone: phone || null,
        role
      };

      return res.status(201).json({
        message: 'Registration successful',
        user
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/login
  login: (req, res, next) => {
    try {
      const { email, password } = req.body;
      const mode = getSecurityMode();

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '6h' });

      const sanitizedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        phone: user.phone
      };

      if (mode === 'vulnerable') {
        // VULNERABLE: Token is returned in JSON payload for frontend to store in localStorage
        // Any DOM/XSS or malicious script can exfiltrate it (CVE-2020-27839)
        return res.json({
          message: 'Login successful (Vulnerable mode: token in response body for localStorage)',
          mode: 'vulnerable',
          token,
          user: sanitizedUser
        });
      } else {
        // DEFENDED: Token stored strictly inside HttpOnly cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 6 * 60 * 60 * 1000 // 6 hours
        });

        return res.json({
          message: 'Login successful (Defended mode: token stored in HttpOnly cookie)',
          mode: 'defended',
          user: sanitizedUser
        });
      }
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout
  logout: (req, res) => {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
  },

  // GET /api/security/status
  getSecurityStatus: (req, res) => {
    return res.json({ mode: getSecurityMode() });
  },

  // POST /api/security/toggle
  toggleSecurityMode: (req, res) => {
    const { mode } = req.body;
    const success = setSecurityMode(mode);
    if (!success) {
      return res.status(400).json({ error: 'Invalid mode. Use "vulnerable" or "defended"' });
    }
    return res.json({
      message: `Security mode successfully updated to ${mode.toUpperCase()}`,
      mode: getSecurityMode()
    });
  }
};

module.exports = authController;
