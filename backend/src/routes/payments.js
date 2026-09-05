const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { upload, relativeUploadPath } = require('../middleware/upload');
const { createCharge, createHostedPayment, verifyWebhookSignature } = require('../utils/zumbopay');
const { notifyUser } = require('../utils/push');
const { isBlocked } = require('../utils/blocks');

const router = express.Router();

// Price list — kept server-side so the app can never send its own amount.
const AMOUNTS = {
  unlock_contact: 50,
  apply: 50,
};
const JOB_POST_BASE = 100;
const JOB_BOOST_ADDON = 50;

// Shown on ZumboPay's hosted checkout page for card payments.
const TITLES = {
  unlock_contact: 'Desbloquear contacto — Emprego Já',
  post_job: 'Publicar vaga — Emprego Já',
  apply: 'Candidatura — Emprego Já',
  buy_credits: 'Comprar créditos — Emprego Já',
};

// Bulk credit packages — 1 credit = 1 application (employee) or 1 job
// posting (employer), bought upfront at a discount instead of paying per
// action every time. Contact unlocking is intentionally never creditable —
// it stays a direct 50 MZN payment regardless of credit balance.
// Prices are fixed presets (not a per-credit formula) so the discount tiers
// stay exact and predictable — see CREDIT_ACTION for which purpose each
// account type's credits spend on.
const CREDIT_PACKAGES = {
  employee: [
    { credits: 5, price: 225 },
    { credits: 10, price: 400 },
    { credits: 20, price: 700 },
  ],
  employer: [
    { credits: 3, price: 270 },
    { credits: 5, price: 425 },
    { credits: 10, price: 700 },
  ],
};
const CREDIT_ACTION = { employee: 'apply', employer: 'post_job' };

function parsePayAmount(payText, payAmount) {
  if (payAmount !== undefined && payAmount !== null && payAmount !== '') {
    const n = Number(payAmount);
    return Number.isFinite(n) ? n : null;
  }
  if (!payText) return null;
  const digits = String(payText).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

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
      const employerName = employer?.company_name || employer?.name;
      const employerPhone = employer?.phone ? `+258 ${employer.phone}` : null;
      const extraInfo = [employer?.location].filter(Boolean).join(' · ');
      await notifyUser(employeeId, {
        type: 'contact_unlocked',
        title: 'O seu contacto foi desbloqueado',
        body:
          `${employerName} desbloqueou o seu contacto e quer falar consigo.` +
          (employerPhone ? ` Contacto: ${employerPhone}` : '') +
          (extraInfo ? ` — ${extraInfo}` : ''),
        data: {
          employerId: payment.user_id,
          employerName,
          employerPhone: employer?.phone || null,
          employerCompanyName: employer?.company_name || null,
          employerLocation: employer?.location || null,
        },
      });
    }
    return;
  }

  if (payment.purpose === 'apply') {
    const { jobId, viaCredit } = payload;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) return;

    const existing = db
      .prepare('SELECT id FROM applications WHERE job_id = ? AND employee_id = ?')
      .get(jobId, payment.user_id);
    if (!existing) {
      const id = newId('app');
      db.prepare('INSERT INTO applications (id, job_id, employee_id) VALUES (?, ?, ?)').run(
        id,
        jobId,
        payment.user_id
      );
      if (viaCredit) {
        db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1').run(payment.user_id);
      }
      const applicant = db.prepare('SELECT * FROM users WHERE id = ?').get(payment.user_id);
      await notifyUser(job.employer_id, {
        type: 'new_application',
        title: 'Nova candidatura recebida',
        body: `${applicant?.name} candidatou-se à vaga "${job.title}".`,
        data: { jobId: job.id, applicationId: id, employeeId: payment.user_id },
      });
    }
    return;
  }

  if (payment.purpose === 'post_job') {
    const {
      title, sector, location, payText, payAmount, availability, requirements, photoPath, boost, viaCredit,
    } = payload;
    const id = newId('job');
    db.prepare(
      `INSERT INTO jobs (
        id, employer_id, title, sector, location, pay_text, pay_amount,
        availability, requirements, photo_url, featured, expires_at
      ) VALUES (@id, @employerId, @title, @sector, @location, @payText, @payAmount,
        @availability, @requirements, @photoUrl, @featured, datetime('now', '+30 days'))`
    ).run({
      id,
      employerId: payment.user_id,
      title: String(title).trim(),
      sector: String(sector).trim(),
      location: location || null,
      payText: payText || null,
      payAmount: parsePayAmount(payText, payAmount),
      availability: availability || null,
      requirements: requirements || null,
      photoUrl: photoPath || null,
      featured: boost ? 1 : 0,
    });
    if (viaCredit) {
      db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1').run(payment.user_id);
    }
    return;
  }

  if (payment.purpose === 'buy_credits') {
    const { credits } = payload;
    if (credits) {
      db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(credits, payment.user_id);
    }
  }
}

// Shared by /charge and /credits/buy — creates the payment record, then
// either kicks off a direct M-Pesa/e-Mola STK push (needs a phone number)
// or a card checkout link (opened in a browser). The actual gated action
// only runs once the payment is confirmed — inline here if ZumboPay
// answers 'success' immediately, otherwise later via the webhook below.
async function startExternalCharge(req, res, { purpose, amount, payload, method, phone }) {
  const isCard = method === 'card';
  const id = newId('pay');
  db.prepare(
    'INSERT INTO payments (id, user_id, purpose, amount, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.user.id, purpose, amount, JSON.stringify(payload));

  try {
    if (isCard) {
      const payment = await createHostedPayment({
        amount,
        title: TITLES[purpose] || 'Pagamento — Emprego Já',
        sourceId: id,
      });
      db.prepare(
        'UPDATE payments SET provider_reference = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).run(payment?.reference || null, id);

      return res.status(201).json({ paymentId: id, status: 'pending', checkoutUrl: payment?.checkout_url });
    }

    const msisdn = `258${String(phone).replace(/\D/g, '').slice(-9)}`;
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
      await completePayment(db.prepare('SELECT * FROM payments WHERE id = ?').get(id));
    }

    res.status(201).json({ paymentId: id, status: charge?.status || 'pending' });
  } catch (err) {
    db.prepare("UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(id);
    res.status(502).json({ error: err.message });
  }
}

// Spends 1 credit on 'apply' or 'post_job' instead of a direct payment.
// post_job's boost add-on stays a real charge even when paid with a
// credit — it's an optional extra, not the core action the credit covers.
async function handleCreditSpend(req, res, purpose, payload) {
  const userRow = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
  if (!userRow || userRow.credits < 1) {
    return res.status(400).json({ error: 'Não tem créditos suficientes.' });
  }

  if (purpose === 'post_job' && payload.boost) {
    const { phone } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório para o destaque.' });
    }
    return startExternalCharge(req, res, {
      purpose: 'post_job',
      amount: JOB_BOOST_ADDON,
      payload: { ...payload, viaCredit: true },
      method: 'mpesa',
      phone,
    });
  }

  const id = newId('pay');
  db.prepare(
    "INSERT INTO payments (id, user_id, purpose, amount, payload, status) VALUES (?, ?, ?, 0, ?, 'success')"
  ).run(id, req.user.id, purpose, JSON.stringify({ ...payload, viaCredit: true }));
  await completePayment(db.prepare('SELECT * FROM payments WHERE id = ?').get(id));
  res.status(201).json({ paymentId: id, status: 'success' });
}

// Starts a payment for one of the paid actions — either a direct
// M-Pesa/e-Mola STK push (method 'mpesa'/'emola', needs a phone number),
// a card checkout link (method 'card', opened in a browser), or spending
// a pre-bought credit (method 'credit', apply/post_job only — never
// unlock_contact). Nothing is created yet for the external-payment paths —
// the actual action only happens once the webhook confirms the payment
// succeeded (see POST /webhook below).
// post_job takes an optional photo, so this route accepts multipart form
// data for it (multer no-ops for plain JSON requests from the other
// purposes, so both work fine through the same route).
router.post('/charge', requireAuth, upload.single('photo'), async (req, res) => {
  const { purpose, method, phone } = req.body;
  let payload = req.body.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  payload = payload || {};

  let amount;
  if (purpose === 'unlock_contact' || purpose === 'apply') {
    amount = AMOUNTS[purpose];
  } else if (purpose === 'post_job') {
    amount = JOB_POST_BASE + (payload.boost ? JOB_BOOST_ADDON : 0);
  } else {
    return res.status(400).json({ error: 'Finalidade de pagamento inválida.' });
  }

  const isCredit = method === 'credit';
  if (isCredit && purpose === 'unlock_contact') {
    return res.status(400).json({ error: 'Desbloquear um contacto não pode ser pago com créditos.' });
  }

  const isCard = method === 'card';
  if (!isCard && !isCredit && (!phone || !String(phone).trim())) {
    return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
  }

  if (purpose === 'unlock_contact') {
    if (req.user.account_type !== 'employer') {
      return res.status(403).json({ error: 'Ação não permitida para este tipo de conta.' });
    }
    const employee = db.prepare('SELECT id, account_type FROM users WHERE id = ?').get(payload.employeeId);
    if (!employee || employee.account_type !== 'employee') {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }
    if (isBlocked(req.user.id, employee.id)) {
      return res.status(403).json({ error: 'Não é possível contactar este utilizador.' });
    }
  }

  if (purpose === 'post_job') {
    if (req.user.account_type !== 'employer') {
      return res.status(403).json({ error: 'Ação não permitida para este tipo de conta.' });
    }
    if (!payload.title || !String(payload.title).trim()) {
      return res.status(400).json({ error: 'O título da vaga é obrigatório.' });
    }
    if (!payload.sector || !String(payload.sector).trim()) {
      return res.status(400).json({ error: 'O sector/profissão é obrigatório.' });
    }
  }

  if (purpose === 'apply') {
    if (req.user.account_type !== 'employee') {
      return res.status(403).json({ error: 'Ação não permitida para este tipo de conta.' });
    }
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(payload.jobId);
    if (!job || !job.active) {
      return res.status(404).json({ error: 'Vaga não encontrada.' });
    }
    if (job.expires_at && new Date(`${job.expires_at.replace(' ', 'T')}Z`) <= new Date()) {
      return res.status(410).json({ error: 'Esta vaga já expirou.' });
    }
    if (isBlocked(req.user.id, job.employer_id)) {
      return res.status(403).json({ error: 'Não é possível candidatar-se a esta vaga.' });
    }
    const existingApplication = db
      .prepare('SELECT id FROM applications WHERE job_id = ? AND employee_id = ?')
      .get(payload.jobId, req.user.id);
    if (existingApplication) {
      return res.status(409).json({ error: 'Já se candidatou a esta vaga.' });
    }
  }

  if (req.file) {
    payload.photoPath = relativeUploadPath(req.file.filename);
  }

  if (isCredit) {
    return handleCreditSpend(req, res, purpose, payload);
  }

  return startExternalCharge(req, res, { purpose, amount, payload, method, phone });
});

// Returns the credit packages for the current account's type, and which
// action (apply/post_job) its credits spend on — kept server-side so the
// app never has to hardcode prices that could drift out of sync.
router.get('/credits/packages', requireAuth, (req, res) => {
  const packages = CREDIT_PACKAGES[req.user.account_type];
  if (!packages) return res.status(403).json({ error: 'Tipo de conta inválido.' });
  res.json({ packages, action: CREDIT_ACTION[req.user.account_type], balance: req.user.credits || 0 });
});

// Buys a bulk credit package — same charge mechanics as /charge (direct
// M-Pesa/e-Mola or card), just for a fixed 'buy_credits' amount instead of
// a gated action. Credits are added once the payment succeeds, in
// completePayment's 'buy_credits' case.
router.post('/credits/buy', requireAuth, async (req, res) => {
  const { credits, method, phone } = req.body;
  const packages = CREDIT_PACKAGES[req.user.account_type];
  if (!packages) return res.status(403).json({ error: 'Tipo de conta inválido.' });

  const pkg = packages.find((p) => p.credits === Number(credits));
  if (!pkg) return res.status(400).json({ error: 'Pacote de créditos inválido.' });

  const isCard = method === 'card';
  if (!isCard && (!phone || !String(phone).trim())) {
    return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
  }

  return startExternalCharge(req, res, {
    purpose: 'buy_credits',
    amount: pkg.price,
    payload: { credits: pkg.credits },
    method,
    phone,
  });
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
  try {
    const signature = req.get('x-zumbopay-signature');
    if (!verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(401).json({ error: 'Assinatura inválida.' });
    }

    console.log('[zumbopay] POST /webhook received:', JSON.stringify(req.body));

    const { event, data } = req.body || {};
    // node:sqlite rejects `undefined` bind params (only null/number/string/
    // buffer are allowed) — a webhook payload missing these fields used to
    // crash the whole process here. Coerce to null so a malformed/partial
    // payload just fails the lookup below instead of taking the server down.
    const paymentId = data?.source_id ?? null;
    const reference = data?.reference ?? null;

    const payment = paymentId
      ? db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId)
      : reference
      ? db.prepare('SELECT * FROM payments WHERE provider_reference = ?').get(reference)
      : null;

    if (!payment) {
      console.log(
        `[zumbopay] webhook matched no payment (source_id=${paymentId}, reference=${reference}) — acknowledging anyway`
      );
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
  } catch (err) {
    // A webhook is external, uncontrolled input — never let a malformed or
    // unexpected payload crash the whole server. Log it and acknowledge so
    // ZumboPay doesn't keep retrying a request we can't process anyway.
    console.error('[webhook] failed to process:', err);
    res.json({ ok: true });
  }
});

module.exports = router;
