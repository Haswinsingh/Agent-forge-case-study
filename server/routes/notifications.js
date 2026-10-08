const express = require('express');
const router = express.Router();
const { query, run } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications - List user's notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const notifications = query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// POST /api/notifications/:id/read - Mark single notification as read
router.post('/:id/read', authenticateToken, (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Update notification error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// POST /api/notifications/read-all - Mark all user notifications as read
router.post('/read-all', authenticateToken, (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Update notifications error:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
});

module.exports = router;
