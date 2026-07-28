const db = require('../db');
const { newId } = require('./ids');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(token) {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

// Creates an in-app notification row and, best-effort, sends a real Expo
// push to every device registered for that user. Push failures are logged
// but never block the in-app notification from being created.
async function notifyUser(userId, { type, title, body, data = {} }) {
  const id = newId('notif');
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, type, title, body || null, JSON.stringify(data));

  const tokens = db
    .prepare(`SELECT expo_push_token FROM push_tokens WHERE user_id = ?`)
    .all(userId)
    .map((r) => r.expo_push_token)
    .filter(isExpoPushToken);

  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body: body || '',
    data,
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('Expo push send failed:', err.message);
  }
}

module.exports = { notifyUser, isExpoPushToken };
