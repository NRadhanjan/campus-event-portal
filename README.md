# Campus Event Portal — Web Application Security Full-Stack Case Study
**Course:** BCSE320L – Web Application Security  
**Project:** Scenario 1 – Campus Event Portal with a Recon Self-Audit  
**Team Members:**
- **Hemanth Varma Mudunuri**
- **Radhanjan Neelamraju**

---

## 🚀 System Architecture & Live Toggle Mode

This project features a live **Security Mode Toggle** (`VULNERABLE` vs `DEFENDED`) that dynamically alters the server and client behavior without needing code restarts. This allows live side-by-side demonstration of attacks and immediate mitigations for evaluation.

```
                  ┌───────────────────────────────────────────┐
                  │       Global Security Mode Switch         │
                  │   SECURITY_MODE = "vulnerable" | "defended"│
                  └─────────────────────┬─────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
     [Vulnerable Mode]                                     [Defended Mode]
 • JWT in localStorage (CVE-2020-27839)                • JWT in HttpOnly SameSite Cookie
 • IDOR on /api/profile/:id (CVE-2024-25635)           • Ownership enforcement (req.user.id === id)
 • Vertical Escalation on /api/admin/* (CVE-2020-5244) • Strict RBAC Middleware (role === 'admin')
 • Stack Trace & Path Leaks (CVE-2019-4751)            • Sanitized Generic Error Handler
 • Leaks X-Powered-By: Express                         • Hardened HTTP Headers with Helmet
```

---

## 🛠️ Tech Stack

- **Frontend:** React 19 (Vite), Axios, Custom Responsive CSS
- **Backend:** Node.js (v22), Express.js, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `helmet`, `cors`
- **Database:** SQLite (embedded via `node:sqlite` DatabaseSync)
- **Security Testing:** Burp Suite / OWASP ZAP, cURL, automated Node exploit runner

---

## 📂 Project Structure

```text
campus-event-portal/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             # SQLite schema, tables & seed data
│   │   │   └── securityMode.js   # Dynamic toggle state ('vulnerable' | 'defended')
│   │   ├── controllers/
│   │   │   ├── authController.js         # Signup, login, logout, toggle
│   │   │   ├── eventController.js        # Event catalog & creation
│   │   │   ├── profileController.js      # Student profile & IDOR target
│   │   │   ├── registrationController.js # RSVP & ticket cancellation
│   │   │   └── adminController.js        # User directory PII dump
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js         # Dual token verification (Bearer / Cookie)
│   │   │   ├── rbacMiddleware.js         # Admin role check (with vulnerable bypass)
│   │   │   └── errorHandler.js           # Verbose stack leak vs sanitized error
│   │   ├── routes/                       # Express routes for each controller
│   │   └── server.js                     # Express app setup and middleware
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── services/api.js      # Axios client with credentials & token interceptor
│   │   ├── App.jsx              # React UI, Events, Dashboard & Interactive Security Lab
│   │   ├── App.css              # Custom styling & exploit terminal theme
│   │   └── main.jsx             # DOM mounting
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── exploits/
    └── test_toggle_dual_mode.js # Automated verification script executing all attacks
```

---

## ⚡ Quick Start Instructions

### 1. Start the Backend API (Port 5000)
```bash
cd backend
npm install
node src/server.js
```
The API starts at `http://localhost:5000`.

### 2. Start the Frontend SPA (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Demo Personas (Pre-Seeded)

| Persona | Email | Password | Role | Student ID |
|---|---|---|---|---|
| **Campus Admin** | `admin@campus.edu` | `Admin@123` | `admin` | `ADMIN-001` |
| **Alice (Student)** | `alice@campus.edu` | `Alice@123` | `student` | `23BCI0126` |
| **Bob (Student)** | `bob@campus.edu` | `Bob@123` | `student` | `23BCI0133` |

---

## 🎯 How to Run the Live Security Audit Script
Run the automated test script to observe all exploits succeed in **Vulnerable Mode**, followed by the mode switch to **Defended Mode** where all attacks are successfully blocked:

```bash
node exploits/test_toggle_dual_mode.js
```
