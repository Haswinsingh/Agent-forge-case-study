const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query, get, run, transaction } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage with safe server-side unique naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `forge-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB safety ceiling
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.zip', '.ppt', '.pptx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed. Supported: PDF, DOC/DOCX, ZIP, PPT/PPTX, XLS/XLSX`));
    }
  }
});

// Helper to validate GitHub repository URL
function isValidGithubUrl(url) {
  if (!url) return false;
  const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+(\/.*)?$/;
  return githubRegex.test(url.trim());
}

// GET /api/submissions - List submissions with role-based filtering
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, case_study_id, search } = req.query;
    let sql = '';
    let params = [];

    if (req.user.role === 'participant') {
      // Participant ONLY sees their own submissions
      sql = `
        SELECT s.*, cs.title as case_study_title, cs.case_study_id as case_study_code,
               p.participant_id as participant_code, u.name as participant_name, u.email as participant_email
        FROM submissions s
        JOIN participants p ON s.participant_id = p.id
        JOIN users u ON p.user_id = u.id
        JOIN case_studies cs ON s.case_study_id = cs.id
        WHERE p.id = ?
      `;
      params = [req.user.participant_db_id];
    } else if (req.user.role === 'jury') {
      // Jury ONLY sees submissions assigned to them
      sql = `
        SELECT s.*, cs.title as case_study_title, cs.case_study_id as case_study_code,
               p.participant_id as participant_code, u.name as participant_name, u.email as participant_email,
               p.team_name,
               ev.status as jury_eval_status, ev.total_score as my_eval_score, ev.is_locked as my_eval_locked
        FROM submissions s
        JOIN jury_assignments ja ON s.id = ja.submission_id
        JOIN participants p ON s.participant_id = p.id
        JOIN users u ON p.user_id = u.id
        JOIN case_studies cs ON s.case_study_id = cs.id
        LEFT JOIN evaluations ev ON s.id = ev.submission_id AND ev.jury_id = ?
        WHERE ja.jury_id = ?
      `;
      params = [req.user.jury_db_id, req.user.jury_db_id];
    } else if (req.user.role === 'admin') {
      // Admin sees everything
      sql = `
        SELECT s.*, cs.title as case_study_title, cs.case_study_id as case_study_code,
               p.participant_id as participant_code, u.name as participant_name, u.email as participant_email,
               p.team_name,
               (SELECT COUNT(*) FROM evaluations e WHERE e.submission_id = s.id AND e.status = 'submitted') as eval_count,
               (SELECT AVG(total_score) FROM evaluations e WHERE e.submission_id = s.id AND e.status = 'submitted') as avg_jury_score
        FROM submissions s
        JOIN participants p ON s.participant_id = p.id
        JOIN users u ON p.user_id = u.id
        JOIN case_studies cs ON s.case_study_id = cs.id
        WHERE 1=1
      `;
    }

    if (case_study_id && req.user.role === 'admin') {
      sql += ' AND s.case_study_id = ?';
      params.push(case_study_id);
    }
    if (status && req.user.role === 'admin') {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    if (search && req.user.role === 'admin') {
      sql += ' AND (p.participant_id LIKE ? OR u.name LIKE ? OR s.submission_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.id DESC';

    const submissions = query(sql, params);

    // Attach uploaded files to each submission
    const result = submissions.map(sub => {
      const files = query('SELECT id, original_filename, file_size, mime_type, upload_timestamp FROM submission_files WHERE submission_id = ?', [sub.id]);
      
      // Check results published status from system_settings
      const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");
      const isPublishedGlobally = pubSetting && pubSetting.value === '1';

      // Security mask: Participant cannot see evaluation marks before admin publishes
      let safeSub = { ...sub, files };
      if (req.user.role === 'participant') {
        if (!isPublishedGlobally && sub.status !== 'RESULT PUBLISHED') {
          safeSub.final_score = null;
          safeSub.rank = null;
          safeSub.admin_remarks = null;
        }
      }

      return safeSub;
    });

    res.json(result);
  } catch (err) {
    console.error('Fetch submissions error:', err);
    res.status(500).json({ error: 'Failed to retrieve submissions.' });
  }
});

// GET /api/submissions/:id - Single submission detail
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const subId = req.params.id;
    const sub = get(`
      SELECT s.*, cs.title as case_study_title, cs.case_study_id as case_study_code,
             cs.problem_statement, cs.instructions, cs.deadline, cs.criteria_config,
             p.participant_id as participant_code, u.name as participant_name, u.email as participant_email,
             p.team_name
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      WHERE s.id = ? OR s.submission_id = ?
    `, [subId, subId]);

    if (!sub) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Authorization checks
    if (req.user.role === 'participant') {
      if (sub.participant_id !== req.user.participant_db_id) {
        return res.status(403).json({ error: "Access denied. You cannot view another participant's submission." });
      }
    } else if (req.user.role === 'jury') {
      const assigned = get('SELECT id FROM jury_assignments WHERE jury_id = ? AND submission_id = ?', [req.user.jury_db_id, sub.id]);
      if (!assigned) {
        return res.status(403).json({ error: 'Access denied. This submission is not assigned to your jury queue.' });
      }
    }

    const files = query('SELECT id, original_filename, file_size, mime_type, upload_timestamp FROM submission_files WHERE submission_id = ?', [sub.id]);

    // Evaluations
    let evaluations = [];
    if (req.user.role === 'admin') {
      evaluations = query(`
        SELECT e.*, j.jury_id as jury_code, u.name as jury_name
        FROM evaluations e
        JOIN jury_members j ON e.jury_id = j.id
        JOIN users u ON j.user_id = u.id
        WHERE e.submission_id = ?
      `, [sub.id]);
    } else if (req.user.role === 'jury') {
      evaluations = query(`
        SELECT * FROM evaluations WHERE submission_id = ? AND jury_id = ?
      `, [sub.id, req.user.jury_db_id]);
    }

    // Results visibility check for participant
    const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");
    const isPublishedGlobally = pubSetting && pubSetting.value === '1';

    let safeSub = {
      ...sub,
      criteria_config: JSON.parse(sub.criteria_config || '[]'),
      files,
      evaluations
    };

    if (req.user.role === 'participant') {
      if (!isPublishedGlobally && sub.status !== 'RESULT PUBLISHED') {
        safeSub.final_score = null;
        safeSub.rank = null;
        safeSub.admin_remarks = null;
        safeSub.evaluations = [];
      }
    }

    res.json(safeSub);
  } catch (err) {
    console.error('Fetch submission detail error:', err);
    res.status(500).json({ error: 'Failed to retrieve submission details.' });
  }
});

// POST /api/submissions - Participant submits solution & files
router.post('/', authenticateToken, requireRole('participant'), upload.array('files', 5), (req, res) => {
  try {
    const { case_study_id, solution_description, github_url } = req.body;
    const participantDbId = req.user.participant_db_id;

    if (!participantDbId) {
      return res.status(400).json({ error: 'Participant record not linked.' });
    }

    if (!case_study_id || !github_url) {
      return res.status(400).json({ error: 'Case Study and GitHub repository URL are required.' });
    }

    // Validate GitHub URL
    if (!isValidGithubUrl(github_url)) {
      return res.status(400).json({ error: 'Please enter a valid GitHub repository URL (e.g., https://github.com/username/project).' });
    }

    // Check case study
    const cs = get('SELECT * FROM case_studies WHERE id = ?', [case_study_id]);
    if (!cs) {
      return res.status(404).json({ error: 'Case study does not exist.' });
    }

    // Check submission deadline
    const deadlineDate = new Date(cs.deadline);
    if (new Date() > deadlineDate) {
      return res.status(400).json({ error: 'Submission deadline has passed. Late submissions are strictly prohibited.' });
    }

    // Check if participant already has a submission (Strict single submission rule)
    const existing = get('SELECT * FROM submissions WHERE participant_id = ? AND case_study_id = ?', [participantDbId, case_study_id]);
    if (existing && existing.is_locked) {
      return res.status(400).json({ error: 'Submission already locked. You cannot modify your submitted work.' });
    }

    // Generate Unique Submission ID: AF-CS001-SUB-0103
    const participant = get('SELECT participant_id FROM participants WHERE id = ?', [participantDbId]);
    const pidPart = participant.participant_id.replace('AF-PART-', '');
    const submissionCode = `${cs.case_study_id}-SUB-${pidPart}`;

    const files = req.files || [];

    const result = transaction(() => {
      let subId;
      if (existing) {
        // Update existing submission draft/in-progress
        run(`
          UPDATE submissions
          SET solution_description = ?,
              github_url = ?,
              status = 'SUBMITTED',
              submission_timestamp = CURRENT_TIMESTAMP,
              is_locked = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [solution_description || '', github_url.trim(), existing.id]);
        subId = existing.id;
      } else {
        // Create new submission
        const ins = run(`
          INSERT INTO submissions (
            submission_id, participant_id, case_study_id, solution_description,
            github_url, status, submission_timestamp, is_locked
          ) VALUES (?, ?, ?, ?, ?, 'SUBMITTED', CURRENT_TIMESTAMP, 1)
        `, [submissionCode, participantDbId, case_study_id, solution_description || '', github_url.trim()]);
        subId = Number(ins.lastInsertRowid);
      }

      // Record uploaded files
      for (const file of files) {
        run(`
          INSERT INTO submission_files (
            submission_id, storage_key, original_filename, file_size, mime_type
          ) VALUES (?, ?, ?, ?, ?)
        `, [subId, file.filename, file.originalname, file.size, file.mimetype]);
      }

      // Automatically assign all active jurors to this submission
      const activeJurors = query("SELECT id FROM jury_members WHERE status = 'active'");
      for (const j of activeJurors) {
        const assigned = get('SELECT id FROM jury_assignments WHERE jury_id = ? AND submission_id = ?', [j.id, subId]);
        if (!assigned) {
          run('INSERT INTO jury_assignments (jury_id, submission_id) VALUES (?, ?)', [j.id, subId]);
        }
      }

      return { subId, submissionCode };
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'participant',
      action: 'SUBMIT_SOLUTION',
      target: result.submissionCode,
      ip_address: req.ip,
      details: `Submitted solution for ${cs.case_study_id} with ${files.length} file(s) and GitHub repository.`
    });

    res.status(201).json({
      message: 'Submission successfully received!',
      submission_id: result.submissionCode,
      id: result.subId
    });
  } catch (err) {
    console.error('Submission creation error:', err);
    res.status(500).json({ error: 'Failed to process submission. Please try again.' });
  }
});

// GET /api/submissions/:id/files/:fileId/download - Secure download endpoint
router.get('/:id/files/:fileId/download', authenticateToken, (req, res) => {
  try {
    const { id, fileId } = req.params;
    const sub = get('SELECT * FROM submissions WHERE id = ?', [id]);
    if (!sub) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Role-based authorization:
    if (req.user.role === 'participant' && sub.participant_id !== req.user.participant_db_id) {
      return res.status(403).json({ error: 'Unauthorized to download this file.' });
    } else if (req.user.role === 'jury') {
      const assigned = get('SELECT id FROM jury_assignments WHERE jury_id = ? AND submission_id = ?', [req.user.jury_db_id, sub.id]);
      if (!assigned) {
        return res.status(403).json({ error: 'Unauthorized to download files for unassigned submissions.' });
      }
    }

    const fileRec = get('SELECT * FROM submission_files WHERE id = ? AND submission_id = ?', [fileId, id]);
    if (!fileRec) {
      return res.status(404).json({ error: 'File attachment not found.' });
    }

    const filePath = path.join(UPLOADS_DIR, fileRec.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File binary does not exist on storage.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRec.original_filename)}"`);
    res.setHeader('Content-Type', fileRec.mime_type || 'application/octet-stream');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('File download error:', err);
    res.status(500).json({ error: 'Failed to stream download file.' });
  }
});

module.exports = router;
