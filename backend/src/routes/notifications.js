const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { serializeNotification } = require('../utils/serialize');
const { isExpoPushToken } = require('../utils/push');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 200')
    .all(req.user.id);
  res.json({ notifications: rows.map(serializeNotification) });
});

router.get('/unread-count', requireAuth, (req, res) => {
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0')
    .get(req.user.id);
  res.json({ count });
});

router.post('/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user.id
  );
  res.json({ ok: true });
});

router.post('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.post('/push-token', requireAuth, (req, res) => {
  const { expoPushToken } = req.body;
  if (!isExpoPushToken(expoPushToken)) {
    return res.status(400).json({ error: 'Token de notificação inválido.' });
  }
  db.prepare(
    `INSERT OR IGNORE INTO push_tokens (id, user_id, expo_push_token) VALUES (?, ?, ?)`
  ).run(newId('push'), req.user.id, expoPushToken);
  res.status(201).json({ ok: true });
});

module.exports = router;
