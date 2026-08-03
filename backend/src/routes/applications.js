const express = require('express');
const db = require('../db');
const { requireAuth, requireAccountType } = require('../middleware/auth');
const { serializeJob, serializeUser } = require('../utils/serialize');

const router = express.Router();

// Applying now goes through POST /payments/charge (purpose: 'apply', 50
// MZN) so it's gated behind a confirmed payment — see
// backend/src/routes/payments.js.

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

  // Every row here is an applicant to one of this employer's own jobs, so
  // contact is free — the worker initiated it by applying.
  const applicants = rows.map((row) => ({
    applicationId: row.application_id,
    appliedAt: row.applied_at,
    candidate: serializeUser(row, { includePhone: true }),
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

  // Same as /job/:jobId — every row is an applicant, so contact is free.
  const applicants = rows.map((row) => ({
    applicationId: row.application_id,
    appliedAt: row.applied_at,
    jobId: row.job_id,
    jobTitle: row.job_title,
    candidate: serializeUser(row, { includePhone: true }),
  }));

  res.json({ applicants });
});

module.exports = router;
