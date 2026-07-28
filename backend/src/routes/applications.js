const express = require('express');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth, requireAccountType } = require('../middleware/auth');
const { serializeJob, serializeUser } = require('../utils/serialize');
const { notifyUser } = require('../utils/push');

const router = express.Router();

// TODO(payment): require a confirmed 50 MZN M-Pesa/eMola/mKesh charge before this insert.
router.post('/', requireAuth, requireAccountType('employee'), async (req, res) => {
  const { jobId } = req.body;
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job || !job.active) return res.status(404).json({ error: 'Vaga não encontrada.' });

  const existing = db
    .prepare('SELECT id FROM applications WHERE job_id = ? AND employee_id = ?')
    .get(job.id, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'Já se candidatou a esta vaga.' });
  }

  const id = newId('app');
  db.prepare('INSERT INTO applications (id, job_id, employee_id) VALUES (?, ?, ?)').run(
    id,
    job.id,
    req.user.id
  );

  await notifyUser(job.employer_id, {
    type: 'new_application',
    title: 'Nova candidatura recebida',
    body: `${req.user.name} candidatou-se à vaga "${job.title}".`,
    data: { jobId: job.id, applicationId: id, employeeId: req.user.id },
  });

  res.status(201).json({ applicationId: id });
});

router.get('/mine', requireAuth, requireAccountType('employee'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT jobs.*, applications.created_at as applied_at, users.company_name as e_company_name,
              users.name as e_name, users.photo_url as e_photo_url, users.verified as e_verified,
              users.location as e_location
       FROM applications
       JOIN jobs ON jobs.id = applications.job_id
       JOIN users ON users.id = jobs.employer_id
       WHERE applications.employee_id = ?
       ORDER BY applications.created_at DESC`
    )
    .all(req.user.id);

  const applications = rows.map((row) => ({
    appliedAt: row.applied_at,
    job: serializeJob(row, {
      id: row.employer_id,
      company_name: row.e_company_name,
      name: row.e_name,
      photo_url: row.e_photo_url,
      verified: row.e_verified,
      location: row.e_location,
    }),
  }));

  res.json({ applications });
});

// Employer: list applicants for one of their jobs.
router.get('/job/:jobId', requireAuth, requireAccountType('employer'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
  if (!job || job.employer_id !== req.user.id) {
    return res.status(404).json({ error: 'Vaga não encontrada.' });
  }

  const rows = db
    .prepare(
      `SELECT users.*, applications.id as application_id, applications.created_at as applied_at
       FROM applications
       JOIN users ON users.id = applications.employee_id
       WHERE applications.job_id = ?
       ORDER BY applications.created_at DESC`
    )
    .all(job.id);

  const unlockedIds = new Set(
    db
      .prepare('SELECT employee_id FROM contact_unlocks WHERE employer_id = ?')
      .all(req.user.id)
      .map((r) => r.employee_id)
  );

  const applicants = rows.map((row) => ({
    applicationId: row.application_id,
    appliedAt: row.applied_at,
    candidate: serializeUser(row, { includePhone: unlockedIds.has(row.id) }),
  }));

  res.json({ applicants });
});

// Employer: all applications received across every job they posted (for the
// notifications / "candidatos recebidos" view).
router.get('/received', requireAuth, requireAccountType('employer'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT users.*, applications.id as application_id, applications.created_at as applied_at,
              jobs.id as job_id, jobs.title as job_title
       FROM applications
       JOIN jobs ON jobs.id = applications.job_id
       JOIN users ON users.id = applications.employee_id
       WHERE jobs.employer_id = ?
       ORDER BY applications.created_at DESC`
    )
    .all(req.user.id);

  const unlockedIds = new Set(
    db
      .prepare('SELECT employee_id FROM contact_unlocks WHERE employer_id = ?')
      .all(req.user.id)
      .map((r) => r.employee_id)
  );

  const applicants = rows.map((row) => ({
    applicationId: row.application_id,
    appliedAt: row.applied_at,
    jobId: row.job_id,
    jobTitle: row.job_title,
    candidate: serializeUser(row, { includePhone: unlockedIds.has(row.id) }),
  }));

  res.json({ applicants });
});

module.exports = router;
