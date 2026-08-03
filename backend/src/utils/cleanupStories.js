const path = require('node:path');
const fs = require('node:fs/promises');
const db = require('../db');
const { UPLOAD_DIR } = require('../middleware/upload');

// Stories stop appearing in the feed once expired (enforced in the SQL
// query in routes/stories.js), but their photo files and DB rows were
// otherwise kept around forever. This deletes both for anything past its
// expires_at, so storage doesn't grow unbounded as stories get used.
async function cleanupExpiredStories() {
  const expired = db
    .prepare("SELECT id, photo_url FROM stories WHERE expires_at <= datetime('now')")
    .all();

  if (expired.length === 0) return;

  for (const story of expired) {
    if (story.photo_url) {
      const filename = path.basename(story.photo_url);
      try {
        await fs.unlink(path.join(UPLOAD_DIR, filename));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`[cleanup] failed to delete story photo ${filename}:`, err.message);
        }
      }
    }
  }

  const placeholders = expired.map(() => '?').join(',');
  db.prepare(`DELETE FROM stories WHERE id IN (${placeholders})`).run(...expired.map((s) => s.id));
  console.log(`[cleanup] removed ${expired.length} expired story/stories and their photos`);
}

function startStoryCleanupSchedule(intervalMs = 60 * 60 * 1000) {
  cleanupExpiredStories().catch((err) => console.error('[cleanup] initial run failed:', err));
  setInterval(() => {
    cleanupExpiredStories().catch((err) => console.error('[cleanup] scheduled run failed:', err));
  }, intervalMs);
}

module.exports = { cleanupExpiredStories, startStoryCleanupSchedule };
