const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { sendSupportEmail } = require('../utils/email');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { category, description } = req.body;

  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: 'Escolha uma categoria.' });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: 'Descreva o problema.' });
  }

  const id = newId('ticket');
  db.prepare(
    'INSERT INTO support_tickets (id, user_id, category, description) VALUES (?, ?, ?, ?)'
  ).run(id, req.user.id, String(category).trim(), String(description).trim());

  const emailed = await sendSupportEmail({
    category: String(category).trim(),
    description: String(description).trim(),
    reporter: {
      id: req.user.id,
      name: req.user.name,
      accountType: req.user.account_type,
      phone: req.user.phone,
      location: req.user.location,
      companyName: req.user.company_name,
      createdAt: req.user.created_at,
    },
  }).catch((err) => {
    console.error('Falha ao enviar email de suporte:', err.message);
    return false;
  });

  if (emailed) {
    db.prepare('UPDATE support_tickets SET emailed = 1 WHERE id = ?').run(id);
  }

  res.status(201).json({ ok: true });
});

module.exports = router;
