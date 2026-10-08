const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const { query, get, run, transaction } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/participants - List participants (Admin only)
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { search, case_study_id, status } = req.query;

    let sql = `
      SELECT p.id, p.participant_id, p.team_name, p.status, p.default_passkey, p.created_at,
             u.id as user_id, u.name, u.email, u.is_active,
             cs.id as case_study_id, cs.case_study_id as case_study_code, cs.title as case_study_title,
             s.id as submission_id, s.status as submission_status, s.submission_timestamp, s.final_score
      FROM participants p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN case_studies cs ON p.assigned_case_study_id = cs.id
      LEFT JOIN submissions s ON s.participant_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (case_study_id) {
      sql += ' AND p.assigned_case_study_id = ?';
      params.push(case_study_id);
    }
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (p.participant_id LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR p.team_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY p.id ASC';
    const participants = query(sql, params);
    res.json(participants);
  } catch (err) {
    console.error('Fetch participants error:', err);
    res.status(500).json({ error: 'Failed to retrieve participants.' });
  }
});

// POST /api/participants - Create single participant manually
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { email, name, team_name, assigned_case_study_id, passkey } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: `A user with email ${cleanEmail} already exists.` });
    }

    // Default passkey is portion before @ if not provided
    const defaultPasskey = (passkey && passkey.trim()) || cleanEmail.split('@')[0];
    const passwordHash = await bcrypt.hash(defaultPasskey, 10);

    // Auto-generate Participant ID
    const countRow = get('SELECT COUNT(*) as count FROM participants');
    const nextNum = (countRow.count + 1).toString().padStart(3, '0');
    const participantCode = `AF-PART-${nextNum}`;

    const newParticipant = transaction(() => {
      const uRes = run(`
        INSERT INTO users (email, password_hash, role, name, is_active)
        VALUES (?, ?, 'participant', ?, 1)
      `, [cleanEmail, passwordHash, name.trim()]);
      const userId = Number(uRes.lastInsertRowid);

      const pRes = run(`
        INSERT INTO participants (user_id, participant_id, team_name, assigned_case_study_id, default_passkey, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `, [userId, participantCode, team_name || null, assigned_case_study_id || null, defaultPasskey]);

      return {
        id: Number(pRes.lastInsertRowid),
        participant_id: participantCode,
        name: name.trim(),
        email: cleanEmail,
        default_passkey: defaultPasskey
      };
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'CREATE_PARTICIPANT',
      target: newParticipant.participant_id,
      ip_address: req.ip,
      details: `Created participant: ${newParticipant.email}`
    });

    res.status(201).json({
      message: 'Participant created successfully.',
      participant: newParticipant
    });
  } catch (err) {
    console.error('Create participant error:', err);
    res.status(500).json({ error: 'Failed to create participant.' });
  }
});

// POST /api/participants/bulk-preview - Upload Excel file and generate preview
router.post('/bulk-preview', authenticateToken, requireRole('admin'), upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel (.xlsx or .xls) file.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'The uploaded Excel file has no readable sheets.' });
    }

    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'No data rows found in the uploaded sheet.' });
    }

    const previewList = [];
    const invalidErrors = [];
    let validCount = 0;
    let duplicateCount = 0;
    const seenEmails = new Set();

    const existingUsers = query('SELECT email FROM users');
    const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

    const caseStudies = query('SELECT id, case_study_id, title FROM case_studies');
    const csMap = new Map();
    caseStudies.forEach(cs => {
      csMap.set(cs.case_study_id.toUpperCase(), cs.id);
      csMap.set(cs.title.toLowerCase(), cs.id);
    });

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // Accounting for 1-based index and header
      // Match columns flexibly
      const email = (row['Official Email'] || row['Official email'] || row['Email'] || row['email'] || '').toString().trim().toLowerCase();
      const name = (row['Name'] || row['Participant Name'] || row['name'] || '').toString().trim();
      const team = (row['Team'] || row['Team Name'] || row['team'] || '').toString().trim();
      const caseStudyInput = (row['Assigned Case Study'] || row['Case Study'] || row['case_study'] || '').toString().trim();
      let passkey = (row['Passkey'] || row['passkey'] || '').toString().trim();

      if (!email) {
        invalidErrors.push(`Row ${rowNum}: Missing email address.`);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        invalidErrors.push(`Row ${rowNum}: Invalid email format (${email}).`);
        return;
      }

      if (seenEmails.has(email) || existingEmailSet.has(email)) {
        duplicateCount++;
        invalidErrors.push(`Row ${rowNum}: Duplicate email already exists (${email}).`);
        return;
      }

      seenEmails.add(email);

      // Auto-derive passkey from portion before @ if blank
      if (!passkey) {
        passkey = email.split('@')[0];
      }

      // Resolve case study if provided
      let assignedCsId = null;
      let matchedCsTitle = 'None';
      if (caseStudyInput) {
        const found = csMap.get(caseStudyInput.toUpperCase()) || csMap.get(caseStudyInput.toLowerCase());
        if (found) {
          assignedCsId = found;
          matchedCsTitle = caseStudyInput;
        }
      }

      validCount++;
      previewList.push({
        rowNumber: rowNum,
        email,
        name: name || `Participant ${email.split('@')[0]}`,
        team_name: team || 'Individual',
        default_passkey: passkey,
        assigned_case_study_id: assignedCsId,
        case_study_label: matchedCsTitle,
        isValid: true
      });
    });

    res.json({
      totalRows: rawRows.length,
      validCount,
      invalidCount: invalidErrors.length - duplicateCount,
      duplicateCount,
      preview: previewList.slice(0, 50), // Show first 50 rows in UI preview
      fullValidData: previewList,
      errors: invalidErrors
    });
  } catch (err) {
    console.error('Excel preview error:', err);
    res.status(500).json({ error: 'Failed to process Excel file. Please ensure it is a valid .xlsx or .xls file.' });
  }
});

// POST /api/participants/bulk-import - Commit validated Excel rows into database
router.post('/bulk-import', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows provided for import.' });
    }

    const saltRounds = 10;
    const countRow = get('SELECT COUNT(*) as count FROM participants');
    let startIdx = countRow.count + 1;

    // Pre-hash passwords
    const preparedRows = [];
    for (const r of rows) {
      const hash = await bcrypt.hash(r.default_passkey, saltRounds);
      const pid = `AF-PART-${startIdx.toString().padStart(3, '0')}`;
      startIdx++;
      preparedRows.push({ ...r, password_hash: hash, participant_code: pid });
    }

    let insertedCount = 0;
    transaction(() => {
      for (const item of preparedRows) {
        const uRes = run(`
          INSERT INTO users (email, password_hash, role, name, is_active)
          VALUES (?, ?, 'participant', ?, 1)
        `, [item.email, item.password_hash, item.name]);
        const userId = Number(uRes.lastInsertRowid);

        run(`
          INSERT INTO participants (user_id, participant_id, team_name, assigned_case_study_id, default_passkey, status)
          VALUES (?, ?, ?, ?, ?, 'active')
        `, [userId, item.participant_code, item.team_name, item.assigned_case_study_id, item.default_passkey]);

        insertedCount++;
      }
    });

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'BULK_IMPORT_PARTICIPANTS',
      target: 'Participants Table',
      ip_address: req.ip,
      details: `Bulk imported ${insertedCount} participants with auto-generated credentials`
    });

    res.json({
      message: `Successfully imported ${insertedCount} participants.`,
      importedCount
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Transaction rolled back. Bulk import failed.' });
  }
});

// PUT /api/participants/:id - Update participant status or case study
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const pId = req.params.id;
    const { team_name, assigned_case_study_id, status } = req.body;

    const p = get('SELECT * FROM participants WHERE id = ?', [pId]);
    if (!p) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    run(`
      UPDATE participants
      SET team_name = COALESCE(?, team_name),
          assigned_case_study_id = COALESCE(?, assigned_case_study_id),
          status = COALESCE(?, status)
      WHERE id = ?
    `, [team_name, assigned_case_study_id, status, pId]);

    if (status) {
      const activeVal = status === 'active' ? 1 : 0;
      run('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, p.user_id]);
    }

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'UPDATE_PARTICIPANT',
      target: p.participant_id,
      ip_address: req.ip,
      details: `Updated participant ${p.participant_id} (Status: ${status || p.status})`
    });

    res.json({ message: 'Participant updated successfully.' });
  } catch (err) {
    console.error('Update participant error:', err);
    res.status(500).json({ error: 'Failed to update participant.' });
  }
});

// POST /api/participants/:id/reset-passkey - Admin resets passkey
router.post('/:id/reset-passkey', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const pId = req.params.id;
    const { new_passkey } = req.body;

    const p = get('SELECT p.*, u.email FROM participants p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [pId]);
    if (!p) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    const targetPasskey = (new_passkey && new_passkey.trim()) || p.email.split('@')[0];
    const newHash = await bcrypt.hash(targetPasskey, 10);

    run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, p.user_id]);
    run('UPDATE participants SET default_passkey = ? WHERE id = ?', [targetPasskey, pId]);

    recordAuditLog({
      user_email: req.user.email,
      user_role: 'admin',
      action: 'RESET_PASSKEY',
      target: p.participant_id,
      ip_address: req.ip,
      details: `Admin reset passkey for ${p.participant_id}`
    });

    res.json({
      message: 'Passkey reset successfully.',
      new_passkey: targetPasskey
    });
  } catch (err) {
    console.error('Reset passkey error:', err);
    res.status(500).json({ error: 'Failed to reset passkey.' });
  }
});

module.exports = router;
