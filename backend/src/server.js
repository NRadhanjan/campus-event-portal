const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { getSecurityMode } = require('./config/securityMode');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const securityRoutes = require('./routes/securityRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic Security Headers Middleware
app.use((req, res, next) => {
  const mode = getSecurityMode();
  if (mode === 'defended') {
    // In defended mode, apply helmet protection and hide fingerprinting
    app.disable('x-powered-by');
    helmet({
      contentSecurityPolicy: false // Allow local SPA testing easily
    })(req, res, next);
  } else {
    // In vulnerable mode, leave default Express headers (X-Powered-By: Express) intact
    // to allow server stack fingerprinting
    res.setHeader('X-Powered-By', 'Express');
    next();
  }
});

// Configure CORS to allow frontend communication with credentials (cookies)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger with security mode status
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] [MODE: ${getSecurityMode().toUpperCase()}] ${req.method} ${req.url}`);
  next();
});

// Mount Routes matching Table 3.1 Attack-Surface Inventory
app.use('/api/auth', authRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/register', registrationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Dedicated route to demonstrate stack trace disclosure (CVE-2019-4751, CVE-2024-43376)
app.get('/api/test/stack-trace', (req, res, next) => {
  const err = new Error('DatabaseConnectionTimeoutException: Connection pool exhausted at db_cluster_node_3:5432');
  err.status = 500;
  next(err);
});

// Root API probe
app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    portal: 'Campus Event Portal API',
    securityMode: getSecurityMode(),
    endpointsAudited: 12
  });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('========================================================');
  console.log(` Campus Event Portal API running on http://localhost:${PORT}`);
  console.log(` Initial Security Mode: ${getSecurityMode().toUpperCase()}`);
  console.log(' Toggle Mode via: POST http://localhost:5000/api/security/toggle');
  console.log('========================================================');
});

module.exports = app;
