const express = require('express');
const router = express.Router();
const { query, get, run, transaction } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

// Helper to calculate rankings with proper tie handling
function computeRankings(caseStudyId = null) {
  let sql = `
    SELECT s.id, s.final_score
    FROM submissions s
    WHERE s.final_score IS NOT NULL
  `;
  const params = [];
  if (caseStudyId) {
    sql += ' AND s.case_study_id = ?';
    params.push(caseStudyId);
  }
  sql += ' ORDER BY s.final_score DESC';

  const rows = query(sql, params);
  let currentRank = 1;

  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].final_score < rows[i - 1].final_score) {
      currentRank = i + 1;
    }
    run('UPDATE submissions SET rank = ? WHERE id = ?', [currentRank, rows[i].id]);
  }
}

// GET /api/results/dashboard-stats - Admin KPI overview stats
router.get('/dashboard-stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const totalParticipants = get("SELECT COUNT(*) as count FROM participants WHERE status = 'active'").count;
    const totalSubmissions = get("SELECT COUNT(*) as count FROM submissions").count;
    const submittedCount = get("SELECT COUNT(*) as count FROM submissions WHERE status = 'SUBMITTED'").count;
    const underReviewCount = get("SELECT COUNT(*) as count FROM submissions WHERE status = 'UNDER REVIEW'").count;
    const evaluatedCount = get("SELECT COUNT(*) as count FROM submissions WHERE status = 'EVALUATED'").count;
    const resultsPublishedCount = get("SELECT COUNT(*) as count FROM submissions WHERE status = 'RESULT PUBLISHED'").count;

    const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");
    const isGlobalPublished = pubSetting && pubSetting.value === '1';

    // Scores analytics
    const scoreStats = get(`
      SELECT AVG(final_score) as avg_score, MAX(final_score) as max_score, MIN(final_score) as min_score
      FROM submissions
      WHERE final_score IS NOT NULL
    `);

    // Total jury evaluations count
    const totalEvalsAssigned = get("SELECT COUNT(*) as count FROM jury_assignments").count;
    const totalEvalsCompleted = get("SELECT COUNT(*) as count FROM evaluations WHERE status = 'submitted'").count;

    const submissionCompletionPct = totalParticipants > 0 ? +((totalSubmissions / totalParticipants) * 100).toFixed(1) : 0;
    const juryCompletionPct = totalEvalsAssigned > 0 ? +((totalEvalsCompleted / totalEvalsAssigned) * 100).toFixed(1) : 0;

    res.json({
      totalParticipants,
      totalSubmissions,
      submittedCount,
      underReviewCount,
      evaluatedCount,
      resultsPublishedCount,
      isGlobalPublished,
      submissionCompletionPct,
      juryCompletionPct,
      pendingEvaluations: Math.max(0, totalEvalsAssigned - totalEvalsCompleted),
      avgScore: scoreStats.avg_score ? +Number(scoreStats.avg_score).toFixed(2) : 0,
      highestScore: scoreStats.max_score ? +Number(scoreStats.max_score).toFixed(2) : 0,
      lowestScore: scoreStats.min_score ? +Number(scoreStats.min_score).toFixed(2) : 0
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics.' });
  }
});

// GET /api/results/preview - Admin preview of results & rankings
router.get('/preview', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { case_study_id, search, sort = 'rank' } = req.query;
    computeRankings(case_study_id || null);

    let sql = `
      SELECT s.id, s.submission_id, s.participant_id, s.case_study_id, s.final_score, s.admin_score_override,
             s.admin_remarks, s.rank, s.status, s.submission_timestamp,
             p.participant_id as participant_code, p.team_name,
             u.name as participant_name, u.email as participant_email,
             cs.case_study_id as case_study_code, cs.title as case_study_title,
             (SELECT COUNT(*) FROM evaluations e WHERE e.submission_id = s.id AND e.status = 'submitted') as jury_eval_count,
             (SELECT AVG(total_score) FROM evaluations e WHERE e.submission_id = s.id AND e.status = 'submitted') as raw_avg_score
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      WHERE 1=1
    `;
    const params = [];

    if (case_study_id) {
      sql += ' AND s.case_study_id = ?';
      params.push(case_study_id);
    }
    if (search) {
      sql += ' AND (p.participant_id LIKE ? OR u.name LIKE ? OR s.submission_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (sort === 'score') {
      sql += ' ORDER BY s.final_score DESC NULLS LAST';
    } else if (sort === 'name') {
      sql += ' ORDER BY u.name ASC';
    } else {
      sql += ' ORDER BY s.rank ASC NULLS LAST, s.final_score DESC NULLS LAST';
    }

    const rows = query(sql, params);
    const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");

    res.json({
      isPublished: pubSetting && pubSetting.value === '1',
      results: rows
    });
  } catch (err) {
    console.error('Fetch results preview error:', err);
    res.status(500).json({ error: 'Failed to generate result preview.' });
  }
});

// POST /api/results/override - Admin overrides final score or adds remarks
router.post('/override', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { submission_id, override_score, remarks } = req.body;
    if (!submission_id) {
      return res.status(400).json({ error: 'Submission ID is required.' });
    }

    const sub = get('SELECT * FROM submissions WHERE id = ?', [submission_id]);
    if (!sub) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    let finalScore = sub.final_score;
    if (override_score !== undefined && override_score !== '') {
      const numScore = parseFloat(override_score);
      if (isNaN(numScore) || numScore < 0 || numScore > 50) {
        return res.status(400).json({ error: 'Override score must be between 0 and 50.' });
      }
      finalScore = numScore;
      run(`
        UPDATE submissions
        SET admin_score_override = ?,
            final_score = ?,
            admin_remarks = COALESCE(?, admin_remarks),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [numScore, finalScore, remarks || null, submission_id]);
    } else if (remarks !== undefined) {
      run(`
        UPDATE submissions
        SET admin_remarks = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [remarks, submission_id]);
    }

    computeRankings(sub.case_study_id);

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'ADMIN_SCORE_OVERRIDE',
      target: sub.submission_id,
      ip_address: req.ip,
      details: `Admin set score to ${finalScore}/50. Remarks: ${remarks || 'None'}`
    });

    res.json({ message: 'Result updated successfully.' });
  } catch (err) {
    console.error('Score override error:', err);
    res.status(500).json({ error: 'Failed to update result override.' });
  }
});

// POST /api/results/publish - Admin publishes results with transactional safety
router.post('/publish', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'CONFIRM_PUBLISH') {
      return res.status(400).json({ error: 'Explicit confirmation token required to publish results.' });
    }

    transaction(() => {
      // 1. Recalculate all rankings
      computeRankings();

      // 2. Set global system flag
      run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('results_published', '1', CURRENT_TIMESTAMP)");

      // 3. Mark all evaluated submissions as RESULT PUBLISHED
      run(`
        UPDATE submissions
        SET status = 'RESULT PUBLISHED',
            updated_at = CURRENT_TIMESTAMP
        WHERE final_score IS NOT NULL
      `);

      // 4. Update case study status to Results Published
      run("UPDATE case_studies SET status = 'Results Published' WHERE status != 'Draft'");

      // 5. Notify all active participants
      const participants = query("SELECT u.id FROM participants p JOIN users u ON p.user_id = u.id WHERE p.status = 'active'");
      for (const p of participants) {
        run(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, 'Official Results Published!', 'The final evaluation results and rankings for Agent Forge are now live. View your result report now.', 'success')
        `, [p.id]);
      }
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'PUBLISH_RESULTS',
      target: 'Agent Forge Platform',
      ip_address: req.ip,
      details: 'Admin published official evaluation results to all participants'
    });

    res.json({ message: 'Official results have been successfully published to all participants!' });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Transaction rolled back. Failed to publish results.' });
  }
});

// POST /api/results/unpublish - Admin unpublishes results if adjustments needed
router.post('/unpublish', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    transaction(() => {
      run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('results_published', '0', CURRENT_TIMESTAMP)");
      run("UPDATE submissions SET status = 'EVALUATED' WHERE status = 'RESULT PUBLISHED'");
      run("UPDATE case_studies SET status = 'Active' WHERE status = 'Results Published'");
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'UNPUBLISH_RESULTS',
      target: 'Agent Forge Platform',
      ip_address: req.ip,
      details: 'Admin retracted published results back to evaluation review mode'
    });

    res.json({ message: 'Results unpublished. Result visibility is now locked from participants.' });
  } catch (err) {
    console.error('Unpublish error:', err);
    res.status(500).json({ error: 'Failed to unpublish results.' });
  }
});

// GET /api/results/my-result - Participant queries their own result
router.get('/my-result', authenticateToken, requireRole('participant'), (req, res) => {
  try {
    const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");
    const isPublished = pubSetting && pubSetting.value === '1';

    if (!isPublished) {
      return res.status(403).json({
        locked: true,
        message: 'Evaluation results have not yet been published by the competition administration. Please check back later.'
      });
    }

    const sub = get(`
      SELECT s.*, cs.title as case_study_title, cs.case_study_id as case_study_code,
             cs.criteria_config, p.participant_id as participant_code, p.team_name,
             u.name as participant_name, u.email as participant_email
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      WHERE p.id = ?
    `, [req.user.participant_db_id]);

    if (!sub) {
      return res.status(404).json({ error: 'No submission found for this participant account.' });
    }

    // Fetch criteria scores breakdown (average across jurors)
    const evals = query("SELECT * FROM evaluations WHERE submission_id = ? AND status = 'submitted'", [sub.id]);
    
    let criteriaBreakdown = [
      { id: 'crit_1', name: 'Problem Understanding', score: 0, max: 10 },
      { id: 'crit_2', name: 'Innovation & Creativity', score: 0, max: 10 },
      { id: 'crit_3', name: 'Technical Implementation', score: 0, max: 10 },
      { id: 'crit_4', name: 'Feasibility & Impact', score: 0, max: 10 },
      { id: 'crit_5', name: 'Presentation & Overall Quality', score: 0, max: 10 }
    ];

    let commentsList = [];

    if (evals.length > 0) {
      const c1Avg = +(evals.reduce((a, b) => a + b.criterion_1, 0) / evals.length).toFixed(1);
      const c2Avg = +(evals.reduce((a, b) => a + b.criterion_2, 0) / evals.length).toFixed(1);
      const c3Avg = +(evals.reduce((a, b) => a + b.criterion_3, 0) / evals.length).toFixed(1);
      const c4Avg = +(evals.reduce((a, b) => a + b.criterion_4, 0) / evals.length).toFixed(1);
      const c5Avg = +(evals.reduce((a, b) => a + b.criterion_5, 0) / evals.length).toFixed(1);

      criteriaBreakdown[0].score = c1Avg;
      criteriaBreakdown[1].score = c2Avg;
      criteriaBreakdown[2].score = c3Avg;
      criteriaBreakdown[3].score = c4Avg;
      criteriaBreakdown[4].score = c5Avg;

      commentsList = evals.filter(e => e.comments && e.comments.trim()).map(e => e.comments);
    }

    res.json({
      locked: false,
      submission: {
        ...sub,
        criteria_breakdown: criteriaBreakdown,
        jury_feedback: commentsList,
        admin_remarks: sub.admin_remarks
      }
    });
  } catch (err) {
    console.error('Fetch participant result error:', err);
    res.status(500).json({ error: 'Failed to retrieve result.' });
  }
});

// GET /api/results/leaderboard - Published results leaderboard
router.get('/leaderboard', authenticateToken, (req, res) => {
  try {
    const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");
    const isPublished = pubSetting && pubSetting.value === '1';

    if (!isPublished && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Leaderboard is not published yet.' });
    }

    const list = query(`
      SELECT s.id, s.rank, s.final_score, p.participant_id as participant_code,
             u.name as participant_name, p.team_name, cs.title as case_study_title, cs.case_study_id as case_study_code
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      WHERE s.final_score IS NOT NULL
      ORDER BY s.rank ASC, s.final_score DESC
    `);

    res.json({ isPublished, leaderboard: list });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
