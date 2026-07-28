const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { upload, relativeUploadPath } = require('../middleware/upload');
const { serializeStory } = require('../utils/serialize');

const router = express.Router();

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

// TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this insert.
router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'É necessária uma foto real para a story.' });

  const id = newId('story');
  const expiresAt = new Date(Date.now() + STORY_LIFETIME_MS).toISOString();

  db.prepare(
    `INSERT INTO stories (id, user_id, photo_url, caption, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.user.id, relativeUploadPath(req.file.filename), req.body.caption || null, expiresAt);

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
  res.status(201).json({ story: serializeStory(story, req.user) });
});

// Active (non-expired) stories only — enforced in the SQL query itself, not
// just filtered client-side, so an expired story never appears here.
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT stories.*, users.name as u_name, users.account_type as u_account_type,
              users.company_name as u_company_name, users.photo_url as u_photo_url,
              users.verified as u_verified
       FROM stories
       JOIN users ON users.id = stories.user_id
       WHERE stories.expires_at > datetime('now')
       ORDER BY stories.created_at DESC`
    )
    .all();

  const stories = rows.map((row) =>
    serializeStory(row, {
      id: row.user_id,
      name: row.u_name,
      account_type: row.u_account_type,
      company_name: row.u_company_name,
      photo_url: row.u_photo_url,
      verified: row.u_verified,
    })
  );

  res.json({ stories });
});

router.delete('/:id', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story || story.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Story não encontrada.' });
  }
  db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
  res.json({ ok: true });
});

module.exports = router;
