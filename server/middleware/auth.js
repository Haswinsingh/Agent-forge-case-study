const jwt = require('jsonwebtoken');
const { get } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'agent_forge_super_secure_enterprise_key_2026_@!';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or token invalid. Please log in again.' });
    }

    const user = get('SELECT id, email, role, name, is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Account disabled or not found.' });
    }

    req.user = user;

    if (user.role === 'participant') {
      const participant = get('SELECT id, participant_id, team_name, assigned_case_study_id, status FROM participants WHERE user_id = ?', [user.id]);
      if (participant) {
        req.user.participant = participant;
        req.user.participant_db_id = participant.id;
        req.user.participant_id = participant.participant_id;
        req.user.assigned_case_study_id = participant.assigned_case_study_id;
      }
    } else if (user.role === 'jury') {
      const jury = get('SELECT id, jury_id, department, status FROM jury_members WHERE user_id = ?', [user.id]);
      if (jury) {
        req.user.jury = jury;
        req.user.jury_db_id = jury.id;
        req.user.jury_id = jury.jury_id;
      }
    }

    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' is not authorized for this resource.` 
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
