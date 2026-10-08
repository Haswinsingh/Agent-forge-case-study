const express = require('express');
const router = express.Router();
const { query, get, run } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

// GET /api/case-studies - List case studies based on role
router.get('/', authenticateToken, (req, res) => {
  try {
    let sql = 'SELECT * FROM case_studies ORDER BY id ASC';
    const params = [];

    if (req.user.role === 'participant') {
      // Participant gets either their assigned case study or all active ones
      if (req.user.assigned_case_study_id) {
        sql = 'SELECT * FROM case_studies WHERE id = ?';
        params.push(req.user.assigned_case_study_id);
      } else {
        sql = "SELECT * FROM case_studies WHERE status IN ('Active', 'Published') ORDER BY id ASC";
      }
    }

    const rows = query(sql, params).map(cs => ({
      ...cs,
      attached_resources: JSON.parse(cs.attached_resources || '[]'),
      criteria_config: JSON.parse(cs.criteria_config || '[]')
    }));

    res.json(rows);
  } catch (err) {
    console.error('Fetch case studies error:', err);
    res.status(500).json({ error: 'Failed to retrieve case studies.' });
  }
});

// GET /api/case-studies/:id - Get single case study details
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const cs = get('SELECT * FROM case_studies WHERE id = ? OR case_study_id = ?', [req.params.id, req.params.id]);
    if (!cs) {
      return res.status(404).json({ error: 'Case study not found.' });
    }

    // Role check: Participant can only view if assigned or active
    if (req.user.role === 'participant' && req.user.assigned_case_study_id && req.user.assigned_case_study_id !== cs.id) {
      return res.status(403).json({ error: 'You are not assigned to this case study.' });
    }

    res.json({
      ...cs,
      attached_resources: JSON.parse(cs.attached_resources || '[]'),
      criteria_config: JSON.parse(cs.criteria_config || '[]')
    });
  } catch (err) {
    console.error('Fetch case study error:', err);
    res.status(500).json({ error: 'Failed to retrieve case study.' });
  }
});

// POST /api/case-studies - Admin create
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const {
      case_study_id, title, description, problem_statement,
      instructions, deadline, allowed_file_types, max_upload_size_mb,
      github_required, status, criteria_config, scoring_mode
    } = req.body;

    if (!case_study_id || !title || !problem_statement || !deadline) {
      return res.status(400).json({ error: 'Case study ID, title, problem statement, and deadline are required.' });
    }

    const defaultCriteria = [
      { id: 'crit_1', name: 'Problem Understanding', max: 10, description: 'Comprehension of constraints and edge cases.' },
      { id: 'crit_2', name: 'Innovation & Creativity', max: 10, description: 'Novelty of methodology and solution architecture.' },
      { id: 'crit_3', name: 'Technical Implementation', max: 10, description: 'Code quality, modularity, and testing.' },
      { id: 'crit_4', name: 'Feasibility & Impact', max: 10, description: 'Scalability, reliability, and practical application.' },
      { id: 'crit_5', name: 'Presentation & Overall Quality', max: 10, description: 'Documentation clarity, structure, and readability.' }
    ];

    const result = run(`
      INSERT INTO case_studies (
        case_study_id, title, description, problem_statement, instructions,
        attached_resources, deadline, allowed_file_types, max_upload_size_mb,
        github_required, status, criteria_config, scoring_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      case_study_id.toUpperCase().trim(),
      title.trim(),
      description || '',
      problem_statement,
      instructions || '',
      JSON.stringify([]),
      deadline,
      allowed_file_types || 'PDF,DOC,DOCX,ZIP,PPT,PPTX,XLS,XLSX',
      max_upload_size_mb || 50,
      github_required !== undefined ? (github_required ? 1 : 0) : 1,
      status || 'Active',
      JSON.stringify(criteria_config || defaultCriteria),
      scoring_mode || 'average'
    ]);

    recordAuditLog({
      user_email: req.user.email,
      user_role: req.user.role,
      action: 'CREATE_CASE_STUDY',
      target: case_study_id,
      ip_address: req.ip,
      details: `Created case study: ${title}`
    });

    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Case study created successfully.' });
  } catch (err) {
    console.error('Create case study error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Case Study ID already exists. Please choose a unique ID.' });
    }
    res.status(500).json({ error: 'Failed to create case study.' });
  }
});

// PUT /api/case-studies/:id - Admin update
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const csId = req.params.id;
    const existing = get('SELECT * FROM case_studies WHERE id = ?', [csId]);
    if (!existing) {
      return res.status(404).json({ error: 'Case study not found.' });
    }

    const {
      title, description, problem_statement, instructions,
      deadline, allowed_file_types, max_upload_size_mb,
      github_required, status, criteria_config, scoring_mode
    } = req.body;

    run(`
      UPDATE case_studies
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          problem_statement = COALESCE(?, problem_statement),
          instructions = COALESCE(?, instructions),
          deadline = COALESCE(?, deadline),
          allowed_file_types = COALESCE(?, allowed_file_types),
          max_upload_size_mb = COALESCE(?, max_upload_size_mb),
          github_required = COALESCE(?, github_required),
          status = COALESCE(?, status),
          criteria_config = COALESCE(?, criteria_config),
          scoring_mode = COALESCE(?, scoring_mode),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title, description, problem_statement, instructions,
      deadline, allowed_file_types, max_upload_size_mb,
      github_required !== undefined ? (github_required ? 1 : 0) : null,
      status, criteria_config ? JSON.stringify(criteria_config) : null,
      scoring_mode, csId
    ]);

    recordAuditLog({
      user_email: req.user.email,
      user_role: req.user.role,
      action: 'UPDATE_CASE_STUDY',
      target: existing.case_study_id,
      ip_address: req.ip,
      details: `Updated parameters for ${existing.case_study_id}`
    });

    res.json({ message: 'Case study updated successfully.' });
  } catch (err) {
    console.error('Update case study error:', err);
    res.status(500).json({ error: 'Failed to update case study.' });
  }
});

module.exports = router;
