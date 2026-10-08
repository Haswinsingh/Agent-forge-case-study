const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const { query, get } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

// GET /api/reports/excel/master - Admin Master 4-Sheet Excel Workbook Export
router.get('/excel/master', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const wb = xlsx.utils.book_new();

    // Sheet 1 — Participants
    const participantsData = query(`
      SELECT p.participant_id as "Participant ID",
             u.name as "Name",
             u.email as "Official Email",
             COALESCE(cs.case_study_id, 'Not Assigned') as "Case Study",
             CASE WHEN u.is_active = 1 THEN 'Active' ELSE 'Disabled' END as "Login Status",
             COALESCE(s.status, 'NOT STARTED') as "Submission Status",
             COALESCE(s.submission_timestamp, 'N/A') as "Submission Time"
      FROM participants p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN case_studies cs ON p.assigned_case_study_id = cs.id
      LEFT JOIN submissions s ON s.participant_id = p.id
      ORDER BY p.id ASC
    `);
    const wsParticipants = xlsx.utils.json_to_sheet(participantsData);
    xlsx.utils.book_append_sheet(wb, wsParticipants, 'Participants');

    // Sheet 2 — Submissions
    const submissionsData = query(`
      SELECT s.submission_id as "Submission ID",
             p.participant_id as "Participant ID",
             cs.case_study_id as "Case Study",
             s.github_url as "GitHub URL",
             (SELECT COUNT(*) FROM submission_files sf WHERE sf.submission_id = s.id) as "Uploaded Files Count",
             s.submission_timestamp as "Submission Time",
             s.status as "Status"
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      ORDER BY s.id ASC
    `);
    const wsSubmissions = xlsx.utils.json_to_sheet(submissionsData);
    xlsx.utils.book_append_sheet(wb, wsSubmissions, 'Submissions');

    // Sheet 3 — Evaluations
    const evaluationsData = query(`
      SELECT s.submission_id as "Submission ID",
             p.participant_id as "Participant ID",
             j.jury_id || ' - ' || u.name as "Jury",
             e.criterion_1 as "Criterion 1 (Problem Understanding)",
             e.criterion_2 as "Criterion 2 (Innovation & Creativity)",
             e.criterion_3 as "Criterion 3 (Technical Implementation)",
             e.criterion_4 as "Criterion 4 (Feasibility & Impact)",
             e.criterion_5 as "Criterion 5 (Presentation & Quality)",
             e.total_score as "Total Score (/50)",
             e.comments as "Comments",
             e.evaluation_timestamp as "Evaluation Time"
      FROM evaluations e
      JOIN submissions s ON e.submission_id = s.id
      JOIN participants p ON s.participant_id = p.id
      JOIN jury_members j ON e.jury_id = j.id
      JOIN users u ON j.user_id = u.id
      ORDER BY s.id ASC, e.id ASC
    `);
    const wsEvaluations = xlsx.utils.json_to_sheet(evaluationsData);
    xlsx.utils.book_append_sheet(wb, wsEvaluations, 'Evaluations');

    // Sheet 4 — Final Results
    const resultsData = query(`
      SELECT COALESCE(s.rank, 'Unranked') as "Rank",
             p.participant_id as "Participant ID",
             u.name as "Participant Name",
             cs.case_study_id as "Case Study",
             COALESCE(s.final_score, 0) as "Final Score",
             50 as "Maximum Score",
             s.status as "Result Status"
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      ORDER BY s.rank ASC NULLS LAST, s.final_score DESC NULLS LAST
    `);
    const wsResults = xlsx.utils.json_to_sheet(resultsData);
    xlsx.utils.book_append_sheet(wb, wsResults, 'Final Results');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'EXPORT_MASTER_EXCEL',
      target: 'Platform Data',
      ip_address: req.ip,
      details: 'Generated complete multi-sheet Agent Forge Excel workbook'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Agent_Forge_Master_Data.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Master Excel export error:', err);
    res.status(500).json({ error: 'Failed to generate master Excel workbook.' });
  }
});

// GET /api/reports/excel/jury - Jury Authorized Excel Export
router.get('/excel/jury', authenticateToken, requireRole('jury'), (req, res) => {
  try {
    const wb = xlsx.utils.book_new();
    const juryData = query(`
      SELECT s.submission_id as "Submission ID",
             p.participant_id as "Participant ID",
             cs.case_study_id as "Case Study",
             COALESCE(e.criterion_1, 0) as "Criterion 1 (/10)",
             COALESCE(e.criterion_2, 0) as "Criterion 2 (/10)",
             COALESCE(e.criterion_3, 0) as "Criterion 3 (/10)",
             COALESCE(e.criterion_4, 0) as "Criterion 4 (/10)",
             COALESCE(e.criterion_5, 0) as "Criterion 5 (/10)",
             COALESCE(e.total_score, 0) as "Total Score (/50)",
             COALESCE(e.comments, '') as "Comments",
             COALESCE(e.status, 'pending') as "Evaluation Status"
      FROM jury_assignments ja
      JOIN submissions s ON ja.submission_id = s.id
      JOIN participants p ON s.participant_id = p.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      LEFT JOIN evaluations e ON s.id = e.submission_id AND e.jury_id = ja.jury_id
      WHERE ja.jury_id = ?
      ORDER BY s.id ASC
    `, [req.user.jury_db_id]);

    const ws = xlsx.utils.json_to_sheet(juryData);
    xlsx.utils.book_append_sheet(wb, ws, 'My Assigned Evaluations');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Agent_Forge_Jury_${req.user.jury_id}_Evaluations.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Jury Excel export error:', err);
    res.status(500).json({ error: 'Failed to export jury evaluations.' });
  }
});

// Helper to draw Google 4-color top bar on PDF
function drawGoogleBar(doc) {
  const width = doc.page.width;
  const seg = width / 4;
  doc.rect(0, 0, seg, 6).fill('#4285F4'); // Google Blue
  doc.rect(seg, 0, seg, 6).fill('#EA4335'); // Google Red
  doc.rect(seg * 2, 0, seg, 6).fill('#FBBC05'); // Google Yellow
  doc.rect(seg * 3, 0, seg, 6).fill('#34A853'); // Google Green
}

// GET /api/reports/pdf/result/:submissionId - Branded Official Result PDF
router.get('/pdf/result/:submissionId', authenticateToken, (req, res) => {
  try {
    const subId = req.params.submissionId;
    const sub = get(`
      SELECT s.*, cs.title as case_study_title, cs.case_study_id as case_study_code,
             p.participant_id as participant_code, p.team_name,
             u.name as participant_name, u.email as participant_email
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      WHERE s.id = ? OR s.submission_id = ?
    `, [subId, subId]);

    if (!sub) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Role verification
    const pubSetting = get("SELECT value FROM system_settings WHERE key = 'results_published'");
    const isPublished = pubSetting && pubSetting.value === '1';

    if (req.user.role === 'participant') {
      if (sub.participant_id !== req.user.participant_db_id) {
        return res.status(403).json({ error: 'Unauthorized to access this result.' });
      }
      if (!isPublished && sub.status !== 'RESULT PUBLISHED') {
        return res.status(403).json({ error: 'Official results have not been published yet.' });
      }
    }

    const evals = query("SELECT * FROM evaluations WHERE submission_id = ? AND status = 'submitted'", [sub.id]);
    let c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0;
    if (evals.length > 0) {
      c1 = +(evals.reduce((a, b) => a + b.criterion_1, 0) / evals.length).toFixed(1);
      c2 = +(evals.reduce((a, b) => a + b.criterion_2, 0) / evals.length).toFixed(1);
      c3 = +(evals.reduce((a, b) => a + b.criterion_3, 0) / evals.length).toFixed(1);
      c4 = +(evals.reduce((a, b) => a + b.criterion_4, 0) / evals.length).toFixed(1);
      c5 = +(evals.reduce((a, b) => a + b.criterion_5, 0) / evals.length).toFixed(1);
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Agent_Forge_Result_${sub.participant_code}.pdf"`);

    doc.pipe(res);

    // Top Google accent stripe
    drawGoogleBar(doc);

    // Header Branding
    doc.moveDown(1.5);
    doc.fontSize(22).fillColor('#202124').font('Helvetica-Bold').text('AGENT FORGE');
    doc.fontSize(11).fillColor('#5F6368').font('Helvetica').text('CASE STUDY EVALUATION PLATFORM — OFFICIAL SCORECARD');
    doc.moveDown(0.5);
    doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Candidate Info Card
    const infoStartY = doc.y;
    doc.rect(50, infoStartY, 495, 80).fill('#F8F9FA');
    doc.fillColor('#202124').fontSize(10).font('Helvetica-Bold');
    doc.text(`Participant Name:`, 65, infoStartY + 15);
    doc.font('Helvetica').text(`${sub.participant_name} (${sub.participant_code})`, 180, infoStartY + 15);

    doc.font('Helvetica-Bold').text(`Official Email:`, 65, infoStartY + 33);
    doc.font('Helvetica').text(`${sub.participant_email}`, 180, infoStartY + 33);

    doc.font('Helvetica-Bold').text(`Case Study:`, 65, infoStartY + 51);
    doc.font('Helvetica').text(`${sub.case_study_code} — ${sub.case_study_title}`, 180, infoStartY + 51, { width: 350 });

    doc.y = infoStartY + 100;

    // Standardized 5-Criteria Scoring Table
    doc.fontSize(13).fillColor('#202124').font('Helvetica-Bold').text('STANDARDIZED 5-CRITERIA EVALUATION');
    doc.moveDown(0.5);

    const criteria = [
      { name: '1. Problem Understanding & Domain Constraints', score: c1 },
      { name: '2. Innovation & Agentic Architecture', score: c2 },
      { name: '3. Technical Implementation & Engineering Rigor', score: c3 },
      { name: '4. Feasibility, Resilience & Operational Impact', score: c4 },
      { name: '5. Presentation, Documentation & Code Quality', score: c5 }
    ];

    criteria.forEach((crit, index) => {
      const rowY = doc.y;
      doc.rect(50, rowY, 495, 26).fill(index % 2 === 0 ? '#FFFFFF' : '#FAFAFA');
      doc.fillColor('#3C4043').fontSize(10).font('Helvetica').text(crit.name, 65, rowY + 7);
      doc.font('Helvetica-Bold').fillColor('#202124').text(`${crit.score} / 10`, 460, rowY + 7, { align: 'right', width: 70 });
      doc.y = rowY + 28;
    });

    doc.moveDown(1);
    doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Final Score & Rank Highlights
    const scoreBoxY = doc.y;
    doc.rect(50, scoreBoxY, 240, 75).lineWidth(1).strokeColor('#4285F4').stroke();
    doc.fillColor('#4285F4').fontSize(10).font('Helvetica-Bold').text('FINAL AGGREGATE SCORE', 65, scoreBoxY + 14);
    doc.fillColor('#202124').fontSize(26).font('Helvetica-Bold').text(`${sub.final_score !== null ? sub.final_score : 'N/A'}`, 65, scoreBoxY + 32);
    doc.fontSize(12).fillColor('#5F6368').font('Helvetica').text(' / 50.00', 145, scoreBoxY + 44);

    doc.rect(305, scoreBoxY, 240, 75).lineWidth(1).strokeColor('#34A853').stroke();
    doc.fillColor('#34A853').fontSize(10).font('Helvetica-Bold').text('OFFICIAL COMPETITION RANK', 320, scoreBoxY + 14);
    doc.fillColor('#202124').fontSize(26).font('Helvetica-Bold').text(`Rank #${sub.rank || '—'}`, 320, scoreBoxY + 32);

    doc.y = scoreBoxY + 95;

    // Jury Comments & Administrator Remarks
    if (sub.admin_remarks || evals.length > 0) {
      doc.fontSize(12).fillColor('#202124').font('Helvetica-Bold').text('EVALUATION FEEDBACK & REMARKS');
      doc.moveDown(0.3);

      const remarks = sub.admin_remarks || (evals[0] && evals[0].comments) || 'Submissions evaluated across standardized automated test suites and peer jury review.';
      doc.fontSize(9.5).fillColor('#4B5563').font('Helvetica').text(remarks, { width: 495, lineGap: 3 });
      doc.moveDown(1);
    }

    // Official Verification Footer
    doc.strokeColor('#E0E0E0').lineWidth(0.5).moveTo(50, doc.page.height - 80).lineTo(545, doc.page.height - 80).stroke();
    doc.fontSize(8.5).fillColor('#9AA0A6').font('Helvetica').text(
      `Generated by Agent Forge Platform Engine • Verified by Competition Jury • ID: ${sub.submission_id} • Date: ${new Date().toLocaleDateString()}`,
      50,
      doc.page.height - 65,
      { align: 'center', width: 495 }
    );

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate official PDF report.' });
  }
});

// GET /api/reports/pdf/master - Admin Complete Results PDF
router.get('/pdf/master', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const list = query(`
      SELECT s.id, s.rank, s.final_score, s.submission_id,
             p.participant_id as participant_code, u.name as participant_name,
             cs.case_study_id as case_study_code
      FROM submissions s
      JOIN participants p ON s.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN case_studies cs ON s.case_study_id = cs.id
      ORDER BY s.rank ASC NULLS LAST, s.final_score DESC NULLS LAST
    `);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Agent_Forge_Master_Leaderboard_Report.pdf"');

    doc.pipe(res);
    drawGoogleBar(doc);

    doc.moveDown(1.5);
    doc.fontSize(20).fillColor('#202124').font('Helvetica-Bold').text('AGENT FORGE — MASTER COMPETITION REPORT');
    doc.fontSize(10).fillColor('#5F6368').font('Helvetica').text(`Comprehensive Ranking Ledger • Exported: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    // Table Header
    const tableTop = doc.y;
    doc.rect(40, tableTop, 515, 22).fill('#F1F3F4');
    doc.fillColor('#202124').fontSize(9).font('Helvetica-Bold');
    doc.text('Rank', 50, tableTop + 6);
    doc.text('Participant ID', 95, tableTop + 6);
    doc.text('Participant Name', 180, tableTop + 6);
    doc.text('Case Study', 340, tableTop + 6);
    doc.text('Score (/50)', 480, tableTop + 6);

    let curY = tableTop + 24;

    list.forEach((item, index) => {
      if (curY > 780) {
        doc.addPage();
        drawGoogleBar(doc);
        curY = 50;
      }
      doc.rect(40, curY, 515, 20).fill(index % 2 === 0 ? '#FFFFFF' : '#FAFAFA');
      doc.fillColor('#3C4043').fontSize(9).font('Helvetica');
      doc.text(`#${item.rank || '—'}`, 50, curY + 5);
      doc.text(item.participant_code, 95, curY + 5);
      doc.text(item.participant_name, 180, curY + 5);
      doc.text(item.case_study_code, 340, curY + 5);
      doc.font('Helvetica-Bold').fillColor('#1A73E8').text(`${item.final_score || 'N/A'}`, 480, curY + 5);
      curY += 21;
    });

    doc.end();
  } catch (err) {
    console.error('Master PDF export error:', err);
    res.status(500).json({ error: 'Failed to generate master PDF report.' });
  }
});

module.exports = router;
