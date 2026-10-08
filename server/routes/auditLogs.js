const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/audit-logs - Admin view only
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { role, action, search, limit = 100 } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND user_role = ?';
      params.push(role);
    }
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    if (search) {
      sql += ' AND (user_email LIKE ? OR target LIKE ? OR details LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 100);

    const logs = query(sql, params);
    res.json(logs);
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit log ledger.' });
  }
});

module.exports = router;
