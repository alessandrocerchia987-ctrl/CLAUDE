const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { createCharge, verifyWebhookSignature, listWallets } = require('../utils/zumbopay');
const { notifyUser } = require('../utils/push');

const router = express.Router();

// TEMPORARY debug route — open in a browser to see the real wallet_id
// format ZumboPay's API returns. Remove once wallet IDs are confirmed
// working.
router.get('/debug/wallets', async (req, res) => {
  try {
    const result = await listWallets();
    res.status(200).type('text/plain').send(JSON.stringify(result, null, 2));
  } catch (err) {
    res.status(500).type('text/plain').send(err.message);
  }
});

// 50/80 MZN price list — kept server-side so the app can never send its
// own amount.
const AMOUNTS = {
  unlock_contact: 50,
};

// Runs the actual gated action once a payment is confirmed. Each purpose
// gets its own case; add new ones here as more actions get wired to
// payments (job posting, applying, stories, boosts — see TODO(payment)
// comments in their respective route files).
async function completePayment(payment) {
  const payload = JSON.parse(payment.payload || '{}');

  if (payment.purpose === 'unlock_contact') {
    const { employeeId } = payload;
    const employee = db.prepare('SELECT * FROM users WHERE id = ?').get(employeeId);
    if (!employee) return;

    const existing = db
      .prepare('SELECT id FROM contact_unlocks WHERE employer_id = ? AND employee_id = ?')
      .get(payment.user_id, employeeId);
    if (!existing) {
      db.prepare('INSERT INTO contact_unlocks (id, employer_id, employee_id) VALUES (?, ?, ?)').run(
        newId('unlock'),
        payment.user_id,
        employeeId
      );
      const employer = db.prepare('SELECT * FROM users WHERE id = ?').get(payment.user_id);
      await notifyUser(employeeId, {
        type: 'contact_unlocked',
        title: 'O seu contacto foi desbloqueado',
        body: `${employer?.company_name || employer?.name} desbloqueou o seu contacto e pode agora falar consigo.`,
        data: { employerId: payment.user_id },
      });
    }
  }
}

// Starts a direct M-Pesa/e-Mola STK push for one of the paid actions.
// Nothing is created yet — the actual action only happens once the
// webhook confirms the charge succeeded (see POST /webhook below).
router.post('/charge', requireAuth, async (req, res) => {
  const { purpose, phone, payload } = req.body;
  const amount = AMOUNTS[purpose];
  if (!amount) return res.status(400).json({ error: 'Finalidade de pagamento inválida.' });
  if (!phone || !String(phone).trim()) {
    return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
  }

  if (purpose === 'unlock_contact') {
    if (req.user.account_type !== 'employer') {
      return res.status(403).json({ error: 'Ação não permitida para este tipo de conta.' });
    }
    const employee = db.prepare('SELECT id, account_type FROM users WHERE id = ?').get(payload?.employeeId);
    if (!employee || employee.account_type !== 'employee') {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }
  }

  const id = newId('pay');
  db.prepare(
    'INSERT INTO payments (id, user_id, purpose, amount, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.user.id, purpose, amount, JSON.stringify(payload || {}));

  const msisdn = `258${String(phone).replace(/\D/g, '').slice(-9)}`;

  try {
    const charge = await createCharge({
      amount,
      msisdn,
      customerName: req.user.name,
      sourceId: id,
    });

    const reference = charge?.reference || charge?.code || null;
    db.prepare('UPDATE payments SET provider_reference = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      reference,
      id
    );

    if (charge?.status === 'success') {
      db.prepare("UPDATE payments SET status = 'success' WHERE id = ?").run(id);
      await completePayment({ ...db.prepare('SELECT * FROM payments WHERE id = ?').get(id) });
    }

    res.status(201).json({ paymentId: id, status: charge?.status || 'pending' });
  } catch (err) {
    db.prepare("UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(id);
    res.status(502).json({ error: err.message });
  }
});

// Lets the app poll while waiting for the customer to enter their PIN.
router.get('/:id', requireAuth, (req, res) => {
  const payment = db
    .prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });
  res.json({ status: payment.status });
});

// ZumboPay calls this — not user-authenticated, verified by HMAC signature
// instead. req.rawBody is populated in server.js specifically for this.
router.post('/webhook', async (req, res) => {
  const signature = req.get('x-zumbopay-signature');
  if (!verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(401).json({ error: 'Assinatura inválida.' });
  }

  const { event, data } = req.body || {};
  const paymentId = data?.source_id;
  const reference = data?.reference;

  const payment = paymentId
    ? db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId)
    : db.prepare('SELECT * FROM payments WHERE provider_reference = ?').get(reference);

  if (!payment) {
    // Not one of ours (or already deleted) — acknowledge anyway so
    // ZumboPay doesn't keep retrying.
    return res.json({ ok: true });
  }

  if (event === 'payment.succeeded' && payment.status !== 'success') {
    db.prepare("UPDATE payments SET status = 'success', updated_at = datetime('now') WHERE id = ?").run(
      payment.id
    );
    await completePayment(payment);
  } else if (event === 'payment.failed') {
    db.prepare("UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(
      payment.id
    );
  }

  res.json({ ok: true });
});

module.exports = router;
