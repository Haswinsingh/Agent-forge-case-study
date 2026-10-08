import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  ShieldCheck, 
  UserCheck, 
  LogOut, 
  Bell, 
  ExternalLink,
  ChevronDown,
  Layers,
  FileCheck,
  Award
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, role, logout, login } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const list = await api.get('/notifications');
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      // Ignore
    }
  };

  const handleQuickSwitch = async (email, pass) => {
    try {
      await login(email, pass);
    } catch (err) {
      console.error('Quick switch failed:', err.message);
    }
  };

  // Role Navigation Links
  const getNavLinks = () => {
    if (role === 'participant') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'case-study', label: 'Case Study' },
        { id: 'submission', label: 'My Submission' },
        { id: 'result', label: 'Result' },
      ];
    } else if (role === 'jury') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'submissions', label: 'Assigned Submissions' },
        { id: 'reports', label: 'Reports & Export' }
      ];
    } else if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'participants', label: 'Participants' },
        { id: 'jury', label: 'Jury' },
        { id: 'case-studies', label: 'Case Studies' },
        { id: 'submissions', label: 'Submissions' },
        { id: 'results', label: 'Results & Rankings' },
        { id: 'import-export', label: 'Import / Export' },
        { id: 'audit-logs', label: 'Audit Logs' }
      ];
    }
    return [];
  };

  return (
    <>
      {/* Top Demo Quick Switcher Strip */}
      <div className="demo-role-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#9CA3AF' }}>⚡ FAST ROLE SWITCH:</span>
          <button 
            className={`demo-role-btn ${user?.email === 'admin@agentforge.io' ? 'active' : ''}`}
            onClick={() => handleQuickSwitch('admin@agentforge.io', 'Admin@Forge2026!')}
          >
            Admin (Chief)
          </button>
          <button 
            className={`demo-role-btn ${user?.email === 'jury.priya@agentforge.io' ? 'active' : ''}`}
            onClick={() => handleQuickSwitch('jury.priya@agentforge.io', 'Jury@Forge2026!')}
          >
            Jury (Dr. Priya)
          </button>
          <button 
            className={`demo-role-btn ${user?.email === 'sec24cs101@sairamtap.edu.in' ? 'active' : ''}`}
            onClick={() => handleQuickSwitch('sec24cs101@sairamtap.edu.in', 'sec24cs101')}
          >
            Participant #1 (Haswin - Evaluated)
          </button>
          <button 
            className={`demo-role-btn ${user?.email === 'sec24cs116@sairamtap.edu.in' ? 'active' : ''}`}
            onClick={() => handleQuickSwitch('sec24cs116@sairamtap.edu.in', 'sec24cs116')}
          >
            Participant #16 (New/Unsubmitted)
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Status: Production Ready WAL Engine</span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="forge-navbar">
        <div className="google-accent-bar">
          <div className="bar-blue"></div>
          <div className="bar-red"></div>
          <div className="bar-yellow"></div>
          <div className="bar-green"></div>
        </div>

        <div className="navbar-container">
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="1.2" />
                <line x1="10" y1="10" x2="22" y2="10" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="22" y1="10" x2="22" y2="22" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="22" y1="22" x2="10" y2="22" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="10" y1="22" x2="10" y2="10" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="10" y1="10" x2="22" y2="22" stroke="#4285F4" strokeWidth="1.2" />
                <circle cx="10" cy="10" r="3.2" fill="#4285F4" />
                <circle cx="22" cy="10" r="3.2" fill="#EA4335" />
                <circle cx="22" cy="22" r="3.2" fill="#34A853" />
                <circle cx="10" cy="22" r="3.2" fill="#FBBC05" />
              </svg>
              <div>
                <span className="brand-text">AGENT FORGE</span>
              </div>
            </div>
            {role && (
              <span className={`brand-badge ${
                role === 'admin' ? 'style-admin' : role === 'jury' ? 'style-jury' : 'style-part'
              }`}>
                {role.toUpperCase()}
              </span>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="nav-links">
            {getNavLinks().map(link => (
              <button
                key={link.id}
                className={`nav-link-btn ${activeTab === link.id ? 'active' : ''}`}
                onClick={() => setActiveTab(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Notifications Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="btn-outline btn-sm" 
                style={{ padding: '7px 10px', position: 'relative', borderRadius: '50%' }}
                onClick={() => setShowNotifs(!showNotifs)}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: 'var(--google-red)',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '0.65rem',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '40px',
                  width: '320px',
                  background: 'white',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-secondary)'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--google-blue)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: n.is_read ? 'white' : 'var(--google-blue-light)',
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Info Capsule */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-full)'
            }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: role === 'admin' ? 'var(--google-red)' : role === 'jury' ? 'var(--google-blue)' : 'var(--google-green)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--google-red)' }}
              title="Logout"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
