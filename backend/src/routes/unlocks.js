const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth, requireAccountType } = require('../middleware/auth');
const { serializeUser } = require('../utils/serialize');
const { notifyUser } = require('../utils/push');

const router = express.Router();

// TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this insert.
router.post('/', requireAuth, requireAccountType('employer'), async (req, res) => {
  const { employeeId } = req.body;
  const employee = db.prepare('SELECT * FROM users WHERE id = ?').get(employeeId);
  if (!employee || employee.account_type !== 'employee') {
    return res.status(404).json({ error: 'Candidato não encontrado.' });
  }

  const existing = db
    .prepare('SELECT id FROM contact_unlocks WHERE employer_id = ? AND employee_id = ?')
    .get(req.user.id, employee.id);

  if (!existing) {
    db.prepare('INSERT INTO contact_unlocks (id, employer_id, employee_id) VALUES (?, ?, ?)').run(
      newId('unlock'),
      req.user.id,
      employee.id
    );

    await notifyUser(employee.id, {
      type: 'contact_unlocked',
      title: 'O seu contacto foi desbloqueado',
      body: `${req.user.company_name || req.user.name} desbloqueou o seu contacto e pode agora falar consigo.`,
      data: { employerId: req.user.id },
    });
  }

  res.json({ user: serializeUser(employee, { includePhone: true }) });
});

router.get('/', requireAuth, requireAccountType('employer'), (req, res) => {
  const rows = db
    .prepare('SELECT employee_id FROM contact_unlocks WHERE employer_id = ?')
    .all(req.user.id);
  res.json({ unlockedEmployeeIds: rows.map((r) => r.employee_id) });
});

module.exports = router;
