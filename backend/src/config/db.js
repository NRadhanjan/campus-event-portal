const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../campus_portal.db');
const db = new DatabaseSync(dbPath);

function initDatabase() {
  console.log(`[DATABASE] Connecting to SQLite at: ${dbPath}`);

  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      studentId TEXT,
      phone TEXT,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      venue TEXT NOT NULL,
      category TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      createdBy INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users (id)
    );
  `);

  // Create Registrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      eventId INTEGER NOT NULL,
      registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (eventId) REFERENCES events (id)
    );
  `);

  // Seed initial data if empty
  const userCountQuery = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountQuery.get().count;

  if (userCount === 0) {
    console.log('[DATABASE] Seeding initial users and events...');

    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('Admin@123', salt);
    const alicePass = bcrypt.hashSync('Alice@123', salt);
    const bobPass = bcrypt.hashSync('Bob@123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, studentId, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('Campus Administrator', 'admin@campus.edu', adminPass, 'ADMIN-001', '+1-555-0100', 'admin');
    insertUser.run('Alice Johnson', 'alice@campus.edu', alicePass, '23BCI0126', '+1-555-0126', 'student');
    insertUser.run('Bob Smith', 'bob@campus.edu', bobPass, '23BCI0133', '+1-555-0133', 'student');

    const insertEvent = db.prepare(`
      INSERT INTO events (title, description, date, venue, category, capacity, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      'Annual Cyber Security Hackathon 2026',
      '48-hour competitive capture-the-flag and software development challenge for security enthusiasts.',
      '2026-10-15 09:00',
      'Auditorium Hall A',
      'Technical',
      150,
      1
    );

    insertEvent.run(
      'Campus Autumn Career & Tech Fair',
      'Connect with over 40 hiring partners, recruiters, and engineering tech leads.',
      '2026-10-20 10:00',
      'Student Union Quad',
      'Career',
      300,
      1
    );

    insertEvent.run(
      'Cloud Architecture & Web App Security Workshop',
      'Hands-on session on OWASP Top 10 vulnerabilities, secure APIs, and threat modeling.',
      '2026-10-28 14:00',
      'Lab Block 3, Room 302',
      'Workshop',
      60,
      1
    );

    const insertRegistration = db.prepare(`
      INSERT INTO registrations (userId, eventId) VALUES (?, ?)
    `);
    // Alice registered for Event 1
    insertRegistration.run(2, 1);
    // Bob registered for Event 2
    insertRegistration.run(3, 2);

    console.log('[DATABASE] Seeding completed successfully.');
  }
}

initDatabase();

module.exports = db;
