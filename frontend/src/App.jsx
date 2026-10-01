import React, { useState, useEffect } from 'react';
import api from './services/api';
import './App.css';

export default function App() {
  const [securityMode, setSecurityMode] = useState('vulnerable');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'profile', 'admin'
  const [events, setEvents] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [notification, setNotification] = useState(null);

  // Security Lab Playground state
  const [targetIdorId, setTargetIdorId] = useState('3');
  const [auditTerminalLog, setAuditTerminalLog] = useState('Ready for security audit. Choose an exploit probe above.');

  // Create Event Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    venue: '',
    category: 'Technical',
    capacity: 100
  });

  // Fetch initial security status and events
  useEffect(() => {
    fetchSecurityStatus();
    loadEvents();
    // Default auto-login as Alice for instant demo convenience
    autoLogin('alice@campus.edu', 'Alice@123');
  }, []);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchSecurityStatus = async () => {
    try {
      const res = await api.get('/security/status');
      setSecurityMode(res.data.mode);
    } catch (err) {
      console.error('Failed to get security status', err);
    }
  };

  const toggleSecurityMode = async () => {
    const nextMode = securityMode === 'vulnerable' ? 'defended' : 'vulnerable';
    try {
      const res = await api.post('/security/toggle', { mode: nextMode });
      setSecurityMode(res.data.mode);
      showNotification(`Security Mode switched to: ${res.data.mode.toUpperCase()}`, 'success');
      appendLog(`[MODE-SWITCH] Global Security Mode changed to: ${res.data.mode.toUpperCase()}`);
    } catch (err) {
      showNotification('Failed to toggle security mode', 'danger');
    }
  };

  const appendLog = (text) => {
    setAuditTerminalLog(prev => `${new Date().toLocaleTimeString()} - ${text}\n\n${prev}`);
  };

  const autoLogin = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      setCurrentUser(res.data.user);

      if (res.data.token) {
        // Vulnerable mode: store in localStorage
        localStorage.setItem('token', res.data.token);
      } else {
        // Defended mode: token stored in HttpOnly cookie, clear any lingering localStorage
        localStorage.removeItem('token');
      }

      showNotification(`Logged in as ${res.data.user.name} (${res.data.user.role})`, 'success');
      loadProfile();
    } catch (err) {
      showNotification('Login failed', 'danger');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    setCurrentUser(null);
    setUserProfile(null);
    setMyRegistrations([]);
    showNotification('Logged out', 'info');
  };

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await api.get('/profile');
      setUserProfile(res.data.profile);
      setMyRegistrations(res.data.registrations || []);
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  const handleRegisterEvent = async (eventId) => {
    try {
      const res = await api.post('/register', { eventId });
      showNotification(res.data.message, 'success');
      loadEvents();
      loadProfile();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Registration failed', 'danger');
    }
  };

  const handleCancelTicket = async (regId) => {
    try {
      const res = await api.delete(`/register/${regId}`);
      showNotification(res.data.message, 'info');
      loadProfile();
      loadEvents();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Cancellation failed', 'danger');
    }
  };

  const loadAdminUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setAdminUsers(res.data.users || []);
      appendLog(`[ADMIN-ACCESS] /api/admin/users loaded ${res.data.users.length} users successfully.`);
    } catch (err) {
      appendLog(`[ADMIN-BLOCKED] ${err.response?.status} ${err.response?.data?.error || 'Access Denied'}`);
      setAdminUsers([]);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/events', newEvent);
      showNotification(res.data.message, 'success');
      loadEvents();
      setNewEvent({ title: '', description: '', date: '', venue: '', category: 'Technical', capacity: 100 });
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to create event', 'danger');
    }
  };

  // --- SECURITY AUDIT PROBES (REVIEW 2 & 3 DEMOS) ---
  const runIdorProbe = async () => {
    try {
      appendLog(`[PROBE] Sending GET /api/profile/${targetIdorId} using current session...`);
      const res = await api.get(`/profile/${targetIdorId}`);
      appendLog(`[!] EXPLOIT RESULT (Status ${res.status}):\n${JSON.stringify(res.data, null, 2)}`);
      showNotification(securityMode === 'vulnerable' ? 'IDOR Exploit Successful! PII Leaked.' : 'Request Succeeded', 'warning');
    } catch (err) {
      appendLog(`[+] DEFENSE TRIGGERED (Status ${err.response?.status}):\n${JSON.stringify(err.response?.data, null, 2)}`);
      showNotification(`Blocked by Defense: ${err.response?.data?.error}`, 'success');
    }
  };

  const runAdminPrivilegeEscalationProbe = async () => {
    try {
      appendLog(`[PROBE] Sending GET /api/admin/users with token from user: ${currentUser?.email} (${currentUser?.role})...`);
      const res = await api.get('/admin/users');
      appendLog(`[!] EXPLOIT SUCCESS (Status ${res.status}): Dumped ${res.data.total} registered users!\n${JSON.stringify(res.data.users.slice(0, 2), null, 2)}...`);
      showNotification('Vertical Privilege Escalation Successful!', 'danger');
    } catch (err) {
      appendLog(`[+] DEFENSE TRIGGERED (Status ${err.response?.status}):\n${JSON.stringify(err.response?.data, null, 2)}`);
      showNotification(`Blocked: ${err.response?.data?.error}`, 'success');
    }
  };

  const runStackTraceProbe = async () => {
    try {
      appendLog(`[PROBE] Triggering unhandled exception at /api/test/stack-trace...`);
      const res = await api.get('/test/stack-trace');
    } catch (err) {
      if (securityMode === 'vulnerable') {
        appendLog(`[!] INFORMATION DISCLOSURE LEAK (Status ${err.response?.status}):\nLeaked Server Runtime: ${err.response?.data?.serverRuntime}\nLeaked Directory: ${err.response?.data?.serverDir}\nStack snippet:\n${err.response?.data?.stack}`);
        showNotification('Stack Trace & Server Paths Leaked!', 'danger');
      } else {
        appendLog(`[+] DEFENDED RESPONSE (Status ${err.response?.status}):\n${JSON.stringify(err.response?.data, null, 2)}`);
        showNotification('Sanitized Error Handler Kept Server Paths Safe', 'success');
      }
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="brand" onClick={() => setActiveTab('events')}>
          🛡️ Campus Event Portal <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>BCSE320L Case Study</span>
        </div>

        {/* Live Security Mode Toggle Widget */}
        <div className="toggle-widget">
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Security Mode:</span>
          <span className={`mode-badge ${securityMode}`}>
            {securityMode}
          </span>
          <button className="toggle-btn" onClick={toggleSecurityMode}>
            Toggle to {securityMode === 'vulnerable' ? 'Defended' : 'Vulnerable'}
          </button>
        </div>

        {/* Quick User Switcher & Navigation */}
        <div className="nav-links">
          <button
            className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events Catalog
          </button>
          <button
            className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); loadProfile(); }}
          >
            Student Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin'); loadAdminUsers(); }}
          >
            Admin Zone
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                {currentUser.name} ({currentUser.role})
              </span>
              <button className="btn-danger" onClick={handleLogout} style={{ padding: '0.2rem 0.5rem' }}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="toggle-btn" onClick={() => autoLogin('alice@campus.edu', 'Alice@123')}>
                Login Alice
              </button>
              <button className="toggle-btn" onClick={() => autoLogin('bob@campus.edu', 'Bob@123')}>
                Login Bob
              </button>
              <button className="toggle-btn" onClick={() => autoLogin('admin@campus.edu', 'Admin@123')}>
                Login Admin
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div style={{
          backgroundColor: notification.type === 'danger' ? '#ef4444' : notification.type === 'success' ? '#22c55e' : '#3b82f6',
          color: 'white',
          padding: '0.65rem 2rem',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {notification.msg}
        </div>
      )}

      {/* Main Container */}
      <main className="main-content">
        {/* Quick Switch Helper for Presentation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#1e293b', padding: '0.75rem 1.25rem', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Active Identity: <strong style={{ color: '#fff' }}>{currentUser ? `${currentUser.name} (${currentUser.email} - Role: ${currentUser.role})` : 'Not Logged In'}</strong>
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Switch Persona:</span>
            <button className="nav-btn" style={{ background: '#334155' }} onClick={() => autoLogin('alice@campus.edu', 'Alice@123')}>Alice (Student)</button>
            <button className="nav-btn" style={{ background: '#334155' }} onClick={() => autoLogin('bob@campus.edu', 'Bob@123')}>Bob (Student)</button>
            <button className="nav-btn" style={{ background: '#334155' }} onClick={() => autoLogin('admin@campus.edu', 'Admin@123')}>Admin</button>
          </div>
        </div>

        {/* TAB 1: EVENTS CATALOG */}
        {activeTab === 'events' && (
          <div>
            <div className="card-header">
              <h2>Campus Events Directory</h2>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Publicly accessible endpoint (GET /api/events)</span>
            </div>

            <div className="grid-events">
              {events.map(ev => (
                <div key={ev.id} className="event-card">
                  <div>
                    <span className="event-tag">{ev.category}</span>
                    <h3 style={{ fontSize: '1.15rem', margin: '0.5rem 0' }}>{ev.title}</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>{ev.description}</p>
                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>📍 <strong>Venue:</strong> {ev.venue}</p>
                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>📅 <strong>Date:</strong> {ev.date}</p>
                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>👥 <strong>Capacity:</strong> {ev.capacity} seats</p>
                  </div>
                  <div style={{ marginTop: '1.25rem' }}>
                    <button
                      className="btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => handleRegisterEvent(ev.id)}
                    >
                      RSVP / Register Attendance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT DASHBOARD & SECURITY LAB */}
        {activeTab === 'profile' && (
          <div>
            {/* Live Exploit / Recon Laboratory Box */}
            <div className="security-lab-box">
              <div className="lab-title">
                🧪 Live Threat & Exploit Verification Lab (Reviews 2 & 3 Interactive Demo)
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                Test each vulnerability live against the server. Then toggle to <strong>Defended Mode</strong> to prove remediation.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
                {/* IDOR Test Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#0f172a', padding: '0.5rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>IDOR Target User ID:</span>
                  <input
                    type="number"
                    style={{ width: '60px', padding: '0.3rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '4px' }}
                    value={targetIdorId}
                    onChange={(e) => setTargetIdorId(e.target.value)}
                  />
                  <button className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={runIdorProbe}>
                    Trigger IDOR Probe (CVE-2024-25635)
                  </button>
                </div>

                {/* Vertical Escalation Button */}
                <button
                  className="btn-primary"
                  style={{ background: '#7c3aed', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={runAdminPrivilegeEscalationProbe}
                >
                  Attempt Admin Escalation (CVE-2020-5244)
                </button>

                {/* Stack Trace Leak Button */}
                <button
                  className="btn-primary"
                  style={{ background: '#b45309', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={runStackTraceProbe}
                >
                  Probe Stack Trace Leak (CVE-2019-4751)
                </button>
              </div>

              {/* Client Token Storage Inspector (CVE-2020-27839) */}
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#0f172a', padding: '0.6rem 0.85rem', borderRadius: '6px' }}>
                <strong>Client Storage Audit (CVE-2020-27839): </strong>
                {localStorage.getItem('token') ? (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>
                    ⚠️ VULNERABLE: JWT found in browser localStorage! Accessible via DOM/XSS script.
                  </span>
                ) : (
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>
                    🛡️ DEFENDED: No JWT in localStorage. Token secured via HttpOnly SameSite cookie.
                  </span>
                )}
              </div>

              {/* Terminal Logs */}
              <div className="exploit-terminal">
                {auditTerminalLog}
              </div>
            </div>

            {/* Profile Information */}
            <div className="card">
              <h3>Student Profile Details (TB3 Trusted Zone)</h3>
              {userProfile ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Full Name</span>
                    <p style={{ fontWeight: 600 }}>{userProfile.name}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Email Address</span>
                    <p style={{ fontWeight: 600 }}>{userProfile.email}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Student Registration ID</span>
                    <p style={{ fontWeight: 600, color: '#38bdf8' }}>{userProfile.studentId || 'N/A'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Contact Phone</span>
                    <p style={{ fontWeight: 600 }}>{userProfile.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Assigned Role</span>
                    <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{userProfile.role}</p>
                  </div>
                </div>
              ) : (
                <p>Please log in to view student profile.</p>
              )}
            </div>

            {/* Registered Events */}
            <div className="card">
              <h3>Registered Event Passes</h3>
              {myRegistrations.length === 0 ? (
                <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>No registrations found.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Event Title</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Venue</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRegistrations.map(reg => (
                      <tr key={reg.registrationId}>
                        <td>#{reg.registrationId}</td>
                        <td style={{ fontWeight: 600 }}>{reg.title}</td>
                        <td><span className="event-tag">{reg.category}</span></td>
                        <td>{reg.date}</td>
                        <td>{reg.venue}</td>
                        <td>
                          <button
                            className="btn-danger"
                            onClick={() => handleCancelTicket(reg.registrationId)}
                          >
                            Cancel Ticket
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN ZONE */}
        {activeTab === 'admin' && (
          <div>
            <div className="card-header">
              <h2>TB5: Privileged Administrative Zone</h2>
              <span style={{ fontSize: '0.85rem', color: securityMode === 'vulnerable' ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                {securityMode === 'vulnerable' ? '⚠️ Vulnerable Mode: Accessible without admin role claim' : '🛡️ Defended Mode: Enforced by requireAdmin middleware'}
              </span>
            </div>

            {/* User Directory Dump */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>University User Directory (GET /api/admin/users)</h3>
                <button className="btn-primary" onClick={loadAdminUsers}>Refresh User Dump</button>
              </div>

              {adminUsers.length === 0 ? (
                <p style={{ color: '#94a3b8', marginTop: '1rem' }}>No users loaded or access blocked by RBAC.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email (PII)</th>
                      <th>Student ID</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Total Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td style={{ color: '#38bdf8' }}>{u.studentId}</td>
                        <td>{u.phone}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: u.role === 'admin' ? '#7c3aed' : '#0369a1',
                            color: '#fff'
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td>{u.totalRegistrations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Create Event Form */}
            <div className="card">
              <h3>Create New Campus Event (POST /api/admin/events)</h3>
              <form onSubmit={handleCreateEvent} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Event Title</label>
                    <input
                      className="input-field"
                      required
                      value={newEvent.title}
                      onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select
                      className="input-field"
                      value={newEvent.category}
                      onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                    >
                      <option>Technical</option>
                      <option>Career</option>
                      <option>Workshop</option>
                      <option>Cultural</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Date & Time</label>
                    <input
                      className="input-field"
                      placeholder="YYYY-MM-DD HH:MM"
                      required
                      value={newEvent.date}
                      onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Venue</label>
                    <input
                      className="input-field"
                      required
                      value={newEvent.venue}
                      onChange={e => setNewEvent({ ...newEvent, venue: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Seating Capacity</label>
                    <input
                      className="input-field"
                      type="number"
                      required
                      value={newEvent.capacity}
                      onChange={e => setNewEvent({ ...newEvent, capacity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn-primary">Publish Campus Event</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
