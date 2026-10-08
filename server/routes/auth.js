const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, query, run } = require('../db/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password/passkey are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      recordAuditLog({
        user_email: cleanEmail,
        user_role: 'unknown',
        action: 'LOGIN_FAILED',
        target: 'Auth',
        ip_address: req.ip,
        details: 'Invalid email address',
        status: 'FAILURE'
      });
      return res.status(401).json({ error: 'Invalid email or credentials.' });
    }

    if (!user.is_active) {
      recordAuditLog({
        user_email: cleanEmail,
        user_role: user.role,
        action: 'LOGIN_BLOCKED',
        target: 'Auth',
        ip_address: req.ip,
        details: 'Account is disabled by administrator',
        status: 'FAILURE'
      });
      return res.status(403).json({ error: 'This account has been deactivated by the administrator.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      recordAuditLog({
        user_email: cleanEmail,
        user_role: user.role,
        action: 'LOGIN_FAILED',
        target: 'Auth',
        ip_address: req.ip,
        details: 'Incorrect password/passkey attempt',
        status: 'FAILURE'
      });
      return res.status(401).json({ error: 'Invalid email or credentials.' });
    }

    // Role specific details
    let roleDetails = {};
    if (user.role === 'participant') {
      const participant = get(`
        SELECT p.*, cs.title as case_study_title, cs.case_study_id as case_study_code
        FROM participants p
        LEFT JOIN case_studies cs ON p.assigned_case_study_id = cs.id
        WHERE p.user_id = ?
      `, [user.id]);
      roleDetails = { participant };
    } else if (user.role === 'jury') {
      const jury = get('SELECT * FROM jury_members WHERE user_id = ?', [user.id]);
      roleDetails = { jury };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    recordAuditLog({
      user_email: user.email,
      user_role: user.role,
      action: 'LOGIN_SUCCESS',
      target: 'Auth',
      ip_address: req.ip,
      details: `Successful login as ${user.role.toUpperCase()}`,
      status: 'SUCCESS'
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...roleDetails
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  let roleDetails = {};
  if (req.user.role === 'participant') {
    const participant = get(`
      SELECT p.*, cs.title as case_study_title, cs.case_study_id as case_study_code
      FROM participants p
      LEFT JOIN case_studies cs ON p.assigned_case_study_id = cs.id
      WHERE p.user_id = ?
    `, [req.user.id]);
    roleDetails = { participant };
  } else if (req.user.role === 'jury') {
    const jury = get('SELECT * FROM jury_members WHERE user_id = ?', [req.user.id]);
    roleDetails = { jury };
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      ...roleDetails
    }
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  recordAuditLog({
    user_email: req.user.email,
    user_role: req.user.role,
    action: 'LOGOUT',
    target: 'Auth',
    ip_address: req.ip,
    details: 'User logged out',
    status: 'SUCCESS'
  });
  res.json({ message: 'Successfully logged out.' });
});

module.exports = router;
