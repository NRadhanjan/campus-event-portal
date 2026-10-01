const db = require('../config/db');

const eventController = {
  // GET /api/events (Public listing)
  getEvents: (req, res, next) => {
    try {
      const { category, search } = req.query;
      let query = 'SELECT * FROM events WHERE 1=1';
      const params = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (search) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY date ASC';

      const events = db.prepare(query).all(...params);
      return res.json({ count: events.length, events });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/events/:id (Public detail)
  getEventById: (req, res, next) => {
    try {
      const eventId = Number(req.params.id);

      // Trigger test for stack trace disclosure if id is 'error-test'
      if (req.params.id === 'error-test') {
        throw new Error('DatabaseConnectionDeadlockException: Failed to acquire write lock on table events in worker thread 4');
      }

      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Also get attendee count
      const countResult = db.prepare('SELECT COUNT(*) as registeredCount FROM registrations WHERE eventId = ?').get(eventId);

      return res.json({
        event: {
          ...event,
          registeredCount: countResult ? countResult.registeredCount : 0
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/admin/events (Create event - TB5)
  createEvent: (req, res, next) => {
    try {
      const { title, description, date, venue, category, capacity } = req.body;

      if (!title || !date || !venue || !capacity) {
        return res.status(400).json({ error: 'Title, date, venue, and capacity are required.' });
      }

      const insert = db.prepare(`
        INSERT INTO events (title, description, date, venue, category, capacity, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        title,
        description || '',
        date,
        venue,
        category || 'General',
        Number(capacity),
        req.user?.id || 1
      );

      return res.status(201).json({
        message: 'Event created successfully',
        eventId: Number(result.lastInsertRowid)
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = eventController;
