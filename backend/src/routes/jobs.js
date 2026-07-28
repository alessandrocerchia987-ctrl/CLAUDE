const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth, requireAccountType } = require('../middleware/auth');
const { upload, relativeUploadPath } = require('../middleware/upload');
const { serializeJob } = require('../utils/serialize');

const router = express.Router();

function parsePayAmount(payText, payAmount) {
  if (payAmount !== undefined && payAmount !== null && payAmount !== '') {
    const n = Number(payAmount);
    return Number.isFinite(n) ? n : null;
  }
  if (!payText) return null;
  const digits = String(payText).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function getEmployer(job) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(job.employer_id);
}

// TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this insert.
router.post(
  '/',
  requireAuth,
  requireAccountType('employer'),
  upload.single('photo'),
  (req, res) => {
    const { title, sector, location, payText, payAmount, availability, requirements, featured } =
      req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'O título da vaga é obrigatório.' });
    }
    if (!sector || !String(sector).trim()) {
      return res.status(400).json({ error: 'O sector/profissão é obrigatório.' });
    }

    const id = newId('job');
    db.prepare(
      `INSERT INTO jobs (
        id, employer_id, title, sector, location, pay_text, pay_amount,
        availability, requirements, photo_url, featured
      ) VALUES (@id, @employerId, @title, @sector, @location, @payText, @payAmount,
        @availability, @requirements, @photoUrl, @featured)`
    ).run({
      id,
      employerId: req.user.id,
      title: String(title).trim(),
      sector: String(sector).trim(),
      location: location || null,
      payText: payText || null,
      payAmount: parsePayAmount(payText, payAmount),
      availability: availability || null,
      requirements: requirements || null,
      photoUrl: req.file ? relativeUploadPath(req.file.filename) : null,
      // TODO(payment): featured/boosted currently free — require a confirmed charge later.
      featured: featured === 'true' || featured === true ? 1 : 0,
    });

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    res.status(201).json({ job: serializeJob(job, req.user) });
  }
);

router.get('/mine', requireAuth, requireAccountType('employer'), (req, res) => {
  const rows = db
    .prepare('SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ jobs: rows.map((j) => serializeJob(j, req.user)) });
});

router.get('/', requireAuth, (req, res) => {
  const { q, profession, location, availability, minSalary, verifiedOnly } = req.query;

  const clauses = ['jobs.active = 1'];
  const params = {};

  if (q) {
    clauses.push('(jobs.title LIKE @q OR jobs.sector LIKE @q OR jobs.requirements LIKE @q)');
    params.q = `%${q}%`;
  }
  if (profession) {
    clauses.push('jobs.sector LIKE @profession');
    params.profession = `%${profession}%`;
  }
  if (location) {
    clauses.push('jobs.location LIKE @location');
    params.location = `%${location}%`;
  }
  if (availability) {
    clauses.push('jobs.availability = @availability');
    params.availability = availability;
  }
  if (minSalary) {
    clauses.push('jobs.pay_amount >= @minSalary');
    params.minSalary = Number(minSalary);
  }
  if (verifiedOnly === 'true') {
    clauses.push('users.verified = 1');
  }

  const rows = db
    .prepare(
      `SELECT jobs.*, users.company_name as e_company_name, users.name as e_name,
              users.photo_url as e_photo_url, users.verified as e_verified,
              users.location as e_location
       FROM jobs
       JOIN users ON users.id = jobs.employer_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY jobs.featured DESC, jobs.created_at DESC
       LIMIT 200`
    )
    .all(params);

  const jobs = rows.map((row) =>
    serializeJob(row, {
      id: row.employer_id,
      company_name: row.e_company_name,
      name: row.e_name,
      photo_url: row.e_photo_url,
      verified: row.e_verified,
      location: row.e_location,
    })
  );

  res.json({ jobs });
});

router.get('/:id', requireAuth, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Vaga não encontrada.' });
  const employer = getEmployer(job);
  res.json({ job: serializeJob(job, employer) });
});

router.post('/:id/report', requireAuth, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Vaga não encontrada.' });
  db.prepare('INSERT INTO job_reports (id, job_id, reporter_id) VALUES (?, ?, ?)').run(
    newId('report'),
    job.id,
    req.user.id
  );
  res.status(201).json({ ok: true });
});

module.exports = router;
