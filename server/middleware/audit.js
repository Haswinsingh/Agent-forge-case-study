const { run } = require('../db/database');

function recordAuditLog({ user_email, user_role, action, target, ip_address = '127.0.0.1', details = '', status = 'SUCCESS' }) {
  try {
    run(`
      INSERT INTO audit_logs (user_email, user_role, action, target, ip_address, details, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user_email || 'System', user_role || 'system', action, target || '', ip_address, details, status]);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { recordAuditLog };
