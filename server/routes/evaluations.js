const express = require('express');
const router = express.Router();
const { query, get, run, transaction } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

// Helper to recalculate submission final score based on scoring mode
function recalculateSubmissionScore(submissionId) {
  const sub = get('SELECT s.*, cs.scoring_mode FROM submissions s JOIN case_studies cs ON s.case_study_id = cs.id WHERE s.id = ?', [submissionId]);
  if (!sub) return;

  const evals = query("SELECT total_score FROM evaluations WHERE submission_id = ? AND status = 'submitted'", [submissionId]);
  if (evals.length === 0) return;

  const scoringMode = sub.scoring_mode || 'average';
  let finalScore = 0;

  if (scoringMode === 'highest') {
    finalScore = Math.max(...evals.map(e => e.total_score));
  } else if (scoringMode === 'manual' && sub.admin_score_override !== null) {
    finalScore = sub.admin_score_override;
  } else {
    // Default: Average
    const sum = evals.reduce((acc, curr) => acc + curr.total_score, 0);
    finalScore = +(sum / evals.length).toFixed(2);
  }

  // Update submission
  run(`
    UPDATE submissions
    SET final_score = ?,
        status = 'EVALUATED',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [finalScore, submissionId]);
}

// GET /api/evaluations/submission/:submissionId - Fetch evaluations for a submission
router.get('/submission/:submissionId', authenticateToken, (req, res) => {
  try {
    const subId = req.params.submissionId;
    if (req.user.role === 'participant') {
      return res.status(403).json({ error: 'Participants are not permitted to view evaluation sheets directly.' });
    }

    let sql = '';
    let params = [];

    if (req.user.role === 'admin') {
      sql = `
        SELECT e.*, j.jury_id as jury_code, u.name as jury_name, u.email as jury_email, j.department
        FROM evaluations e
        JOIN jury_members j ON e.jury_id = j.id
        JOIN users u ON j.user_id = u.id
        WHERE e.submission_id = ?
      `;
      params = [subId];
    } else if (req.user.role === 'jury') {
      // Juror can only see their own evaluation
      sql = `
        SELECT e.*, j.jury_id as jury_code, u.name as jury_name
        FROM evaluations e
        JOIN jury_members j ON e.jury_id = j.id
        JOIN users u ON j.user_id = u.id
        WHERE e.submission_id = ? AND e.jury_id = ?
      `;
      params = [subId, req.user.jury_db_id];
    }

    const rows = query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch evaluations error:', err);
    res.status(500).json({ error: 'Failed to retrieve evaluations.' });
  }
});

// POST /api/evaluations - Jury saves draft or submits final evaluation
router.post('/', authenticateToken, requireRole('jury'), (req, res) => {
  try {
    const {
      submission_id,
      criterion_1,
      criterion_2,
      criterion_3,
      criterion_4,
      criterion_5,
      comments,
      status // 'draft' or 'submitted'
    } = req.body;

    const juryDbId = req.user.jury_db_id;

    if (!submission_id) {
      return res.status(400).json({ error: 'Submission ID is required.' });
    }

    // Check jury assignment
    const assignment = get('SELECT id FROM jury_assignments WHERE jury_id = ? AND submission_id = ?', [juryDbId, submission_id]);
    if (!assignment) {
      return res.status(403).json({ error: 'You are not assigned to evaluate this submission.' });
    }

    // Check existing evaluation
    const existing = get('SELECT * FROM evaluations WHERE jury_id = ? AND submission_id = ?', [juryDbId, submission_id]);
    if (existing && existing.is_locked && existing.status === 'submitted') {
      return res.status(400).json({ error: 'This evaluation is finalized and locked. Contact the administrator to unlock if corrections are required.' });
    }

    // Validate scores
    const c1 = parseFloat(criterion_1) || 0;
    const c2 = parseFloat(criterion_2) || 0;
    const c3 = parseFloat(criterion_3) || 0;
    const c4 = parseFloat(criterion_4) || 0;
    const c5 = parseFloat(criterion_5) || 0;

    const scores = [c1, c2, c3, c4, c5];
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] < 0 || scores[i] > 10) {
        return res.status(400).json({ error: `Criterion ${i + 1} score must be between 0 and 10.` });
      }
    }

    const isFinalSubmit = status === 'submitted';
    if (isFinalSubmit) {
      // For final submission, ensure scores are valid numbers
      if (scores.some(s => isNaN(s))) {
        return res.status(400).json({ error: 'All 5 criteria scores must be provided for final submission.' });
      }
    }

    const totalScore = +(c1 + c2 + c3 + c4 + c5).toFixed(2);
    const isLocked = isFinalSubmit ? 1 : 0;
    const evalStatus = isFinalSubmit ? 'submitted' : 'draft';

    transaction(() => {
      if (existing) {
        run(`
          UPDATE evaluations
          SET criterion_1 = ?,
              criterion_2 = ?,
              criterion_3 = ?,
              criterion_4 = ?,
              criterion_5 = ?,
              total_score = ?,
              comments = ?,
              status = ?,
              is_locked = ?,
              evaluation_timestamp = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [c1, c2, c3, c4, c5, totalScore, comments || '', evalStatus, isLocked, existing.id]);
      } else {
        run(`
          INSERT INTO evaluations (
            submission_id, jury_id, criterion_1, criterion_2, criterion_3,
            criterion_4, criterion_5, total_score, comments, status, is_locked, evaluation_timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [submission_id, juryDbId, c1, c2, c3, c4, c5, totalScore, comments || '', evalStatus, isLocked]);
      }

      // Update submission status to UNDER REVIEW or EVALUATED
      if (isFinalSubmit) {
        recalculateSubmissionScore(submission_id);
      } else {
        run("UPDATE submissions SET status = 'UNDER REVIEW', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'SUBMITTED'", [submission_id]);
      }
    });

    const sub = get('SELECT submission_id FROM submissions WHERE id = ?', [submission_id]);

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'jury',
      action: isFinalSubmit ? 'EVALUATION_SUBMITTED' : 'EVALUATION_DRAFT_SAVED',
      target: sub ? sub.submission_id : `Submission #${submission_id}`,
      ip_address: req.ip,
      details: `Jury ${req.user.name} recorded score ${totalScore}/50 (${evalStatus})`
    });

    res.json({
      message: isFinalSubmit ? 'Evaluation submitted and locked successfully.' : 'Evaluation draft saved successfully.',
      total_score: totalScore,
      status: evalStatus,
      is_locked: isLocked
    });
  } catch (err) {
    console.error('Submit evaluation error:', err);
    res.status(500).json({ error: 'Failed to record evaluation.' });
  }
});

// POST /api/evaluations/:id/unlock - Admin explicitly unlocks an evaluation
router.post('/:id/unlock', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const evalId = req.params.id;
    const ev = get('SELECT * FROM evaluations WHERE id = ?', [evalId]);
    if (!ev) {
      return res.status(404).json({ error: 'Evaluation record not found.' });
    }

    run('UPDATE evaluations SET is_locked = 0 WHERE id = ?', [evalId]);

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'UNLOCK_EVALUATION',
      target: `Evaluation #${evalId}`,
      ip_address: req.ip,
      details: 'Admin unlocked evaluation for revision'
    });

    res.json({ message: 'Evaluation successfully unlocked for the jury member.' });
  } catch (err) {
    console.error('Unlock evaluation error:', err);
    res.status(500).json({ error: 'Failed to unlock evaluation.' });
  }
});

module.exports = router;
