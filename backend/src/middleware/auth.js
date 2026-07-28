const jwt = require('jsonwebtoken');
const db = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilizador não encontrado.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

function requireAccountType(type) {
  return (req, res, next) => {
    if (req.user.account_type !== type) {
      return res.status(403).json({ error: 'Ação não permitida para este tipo de conta.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireAccountType };
