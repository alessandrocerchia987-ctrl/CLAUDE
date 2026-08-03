const express = require('express');
const db = require('../db');
const { requireAuth, requireAccountType } = require('../middleware/auth');

const router = express.Router();

// Unlocking a contact now goes through POST /payments/charge
// (purpose: 'unlock_contact') so it's gated behind a confirmed M-Pesa/e-Mola
// payment — see backend/src/routes/payments.js.

router.get('/', requireAuth, requireAccountType('employer'), (req, res) => {
  const rows = db
    .prepare('SELECT employee_id FROM contact_unlocks WHERE employer_id = ?')
    .all(req.user.id);
  res.json({ unlockedEmployeeIds: rows.map((r) => r.employee_id) });
});

module.exports = router;
