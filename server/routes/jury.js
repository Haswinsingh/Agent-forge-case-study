const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, get, run, transaction } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

// GET /api/jury - List all jury members with progress telemetry (Admin only)
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const jurors = query(`
      SELECT j.id, j.jury_id, j.department, j.status, j.created_at,
             u.id as user_id, u.name, u.email, u.is_active,
             (SELECT COUNT(*) FROM jury_assignments ja WHERE ja.jury_id = j.id) as assigned_count,
             (SELECT COUNT(*) FROM evaluations e WHERE e.jury_id = j.id AND e.status = 'submitted') as evaluated_count,
             (SELECT AVG(total_score) FROM evaluations e WHERE e.jury_id = j.id AND e.status = 'submitted') as avg_score_given
      FROM jury_members j
      JOIN users u ON j.user_id = u.id
      ORDER BY j.id ASC
    `);

    const result = jurors.map(j => ({
      ...j,
      pending_count: Math.max(0, j.assigned_count - j.evaluated_count),
      avg_score_given: j.avg_score_given ? +Number(j.avg_score_given).toFixed(2) : 0
    }));

    res.json(result);
  } catch (err) {
    console.error('Fetch jury error:', err);
    res.status(500).json({ error: 'Failed to retrieve jury members.' });
  }
});

// POST /api/jury - Admin creates a new jury member
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { email, name, department, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: `User with email ${cleanEmail} already exists.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const countRow = get('SELECT COUNT(*) as count FROM jury_members');
    const juryCode = `JURY-${(countRow.count + 1).toString().padStart(2, '0')}`;

    const newJuror = transaction(() => {
      const uRes = run(`
        INSERT INTO users (email, password_hash, role, name, is_active)
        VALUES (?, ?, 'jury', ?, 1)
      `, [cleanEmail, passwordHash, name.trim()]);
      const userId = Number(uRes.lastInsertRowid);

      const jRes = run(`
        INSERT INTO jury_members (user_id, jury_id, department, status)
        VALUES (?, ?, ?, 'active')
      `, [userId, juryCode, department || 'Evaluation Committee']);

      return {
        id: Number(jRes.lastInsertRowid),
        jury_id: juryCode,
        name: name.trim(),
        email: cleanEmail,
        department: department || 'Evaluation Committee'
      };
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'CREATE_JURY',
      target: newJuror.jury_id,
      ip_address: req.ip,
      details: `Created jury member ${newJuror.name} (${newJuror.email})`
    });

    res.status(201).json({
      message: 'Jury member created successfully.',
      jury: newJuror
    });
  } catch (err) {
    console.error('Create jury error:', err);
    res.status(500).json({ error: 'Failed to create jury member.' });
  }
});

// PUT /api/jury/:id - Update status or department
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const jId = req.params.id;
    const { status, department } = req.body;

    const j = get('SELECT * FROM jury_members WHERE id = ?', [jId]);
    if (!j) {
      return res.status(404).json({ error: 'Jury member not found.' });
    }

    run(`
      UPDATE jury_members
      SET status = COALESCE(?, status),
          department = COALESCE(?, department)
      WHERE id = ?
    `, [status, department, jId]);

    if (status) {
      const activeVal = status === 'active' ? 1 : 0;
      run('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, j.user_id]);
    }

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'UPDATE_JURY',
      target: j.jury_id,
      ip_address: req.ip,
      details: `Updated jury ${j.jury_id} (Status: ${status || j.status})`
    });

    res.json({ message: 'Jury member updated successfully.' });
  } catch (err) {
    console.error('Update jury error:', err);
    res.status(500).json({ error: 'Failed to update jury member.' });
  }
});

// POST /api/jury/assign-case - Assign jury member to all submissions of a case study
router.post('/assign-case', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { jury_id, case_study_id } = req.body;
    if (!jury_id || !case_study_id) {
      return res.status(400).json({ error: 'Jury ID and Case Study ID are required.' });
    }

    const submissions = query('SELECT id FROM submissions WHERE case_study_id = ?', [case_study_id]);
    let count = 0;

    transaction(() => {
      for (const s of submissions) {
        const assigned = get('SELECT id FROM jury_assignments WHERE jury_id = ? AND submission_id = ?', [jury_id, s.id]);
        if (!assigned) {
          run('INSERT INTO jury_assignments (jury_id, submission_id) VALUES (?, ?)', [jury_id, s.id]);
          count++;
        }
      }
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'ASSIGN_JURY_CASE',
      target: `Jury #${jury_id}`,
      ip_address: req.ip,
      details: `Assigned jury to ${count} submissions for Case Study #${case_study_id}`
    });

    res.json({ message: `Successfully assigned jury to ${count} submissions.` });
  } catch (err) {
    console.error('Assign jury error:', err);
    res.status(500).json({ error: 'Failed to assign jury.' });
  }
});

module.exports = router;
