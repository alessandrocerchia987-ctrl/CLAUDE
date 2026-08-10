const db = require('../db');

// Symmetric: true if either user has blocked the other. Used to hide a
// blocked user's content from the other party and to stop paid actions
// (apply, unlock contact, message) between them in either direction.
function isBlocked(userIdA, userIdB) {
  const row = db
    .prepare(
      `SELECT 1 FROM blocked_users
       WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
       LIMIT 1`
    )
    .get(userIdA, userIdB, userIdB, userIdA);
  return !!row;
}

module.exports = { isBlocked };
