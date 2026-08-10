const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');
const db = require('../db');
const { newId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { upload, relativeUploadPath, UPLOAD_DIR } = require('../middleware/upload');
const { serializeUser } = require('../utils/serialize');
const { notifyUser } = require('../utils/push');
const { isBlocked } = require('../utils/blocks');

const router = express.Router();

// Fields any account type may edit about themselves. account_type and phone
// (login identifier) are permanent — never accepted here.
const COMMON_EDITABLE = ['name', 'age', 'gender', 'location', 'bio'];
const EMPLOYEE_EDITABLE = [
  'profession',
  'yearsExperience',
  'experienceDescription',
  'educationLevel',
  'languages',
  'skills',
  'availability',
  'expectedSalary',
  'portfolio',
];
const EMPLOYER_EDITABLE = [
  'companyName',
  'lookingFor',
  'requirements',
  'payOffered',
  'companyDescription',
];

const CAMEL_TO_COLUMN = {
  name: 'name',
  age: 'age',
  gender: 'gender',
  location: 'location',
  bio: 'bio',
  profession: 'profession',
  yearsExperience: 'years_experience',
  experienceDescription: 'experience_description',
  educationLevel: 'education_level',
  languages: 'languages',
  skills: 'skills',
  availability: 'availability',
  expectedSalary: 'expected_salary',
  portfolio: 'portfolio',
  companyName: 'company_name',
  lookingFor: 'looking_for',
  requirements: 'requirements',
  payOffered: 'pay_offered',
  companyDescription: 'company_description',
};

router.patch('/me', requireAuth, (req, res) => {
  const editableKeys =
    req.user.account_type === 'employee'
      ? [...COMMON_EDITABLE, ...EMPLOYEE_EDITABLE]
      : [...COMMON_EDITABLE, ...EMPLOYER_EDITABLE];

  const sets = [];
  const params = {};
  for (const key of editableKeys) {
    if (!(key in req.body)) continue;
    const column = CAMEL_TO_COLUMN[key];
    let value = req.body[key];
    if (key === 'languages' || key === 'skills') value = JSON.stringify(value || []);
    if (key === 'age' || key === 'yearsExperience' || key === 'expectedSalary') {
      value = value === null || value === '' ? null : Number(value);
    }
    sets.push(`${column} = @${key}`);
    params[key] = value;
  }

  if (sets.length === 0) {
    return res.json({ user: serializeUser(req.user, { includePhone: true }) });
  }

  params.id = req.user.id;
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: serializeUser(updated, { includePhone: true }) });
});

router.post('/me/photo', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  const relPath = relativeUploadPath(req.file.filename);
  db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(relPath, req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: serializeUser(updated, { includePhone: true }) });
});

// Permanent — deletes the account and, via ON DELETE CASCADE, everything
// tied to it (jobs, applications, contact unlocks, notifications, stories,
// reports, payments, push tokens, block relationships).
router.delete('/me', requireAuth, async (req, res) => {
  if (req.user.photo_url) {
    try {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(req.user.photo_url)));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Failed to delete profile photo:', err.message);
    }
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.post('/:id/block', requireAuth, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Não pode bloquear a sua própria conta.' });
  }
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  db.prepare(
    'INSERT OR IGNORE INTO blocked_users (id, blocker_id, blocked_id) VALUES (?, ?, ?)'
  ).run(newId('block'), req.user.id, req.params.id);
  res.status(201).json({ ok: true });
});

router.delete('/:id/block', requireAuth, (req, res) => {
  db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').run(
    req.user.id,
    req.params.id
  );
  res.json({ ok: true });
});

// Minimal one-way in-app message: delivered as a notification to the
// recipient (no threads/read-receipts — just enough to satisfy the
// "in-app message" contact option alongside WhatsApp).
router.post('/:id/message', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Escreva uma mensagem.' });
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilizador não encontrado.' });
  if (isBlocked(req.user.id, target.id)) {
    return res.status(403).json({ error: 'Não é possível contactar este utilizador.' });
  }

  await notifyUser(target.id, {
    type: 'direct_message',
    title: `Mensagem de ${req.user.company_name || req.user.name}`,
    body: String(text).trim(),
    data: { fromUserId: req.user.id },
  });

  res.status(201).json({ ok: true });
});

// A worker who has applied to any of this employer's jobs is free to
// contact — they initiated it. Paying to unlock only applies when the
// employer reaches out to a worker who hasn't applied anywhere for them.
function hasAppliedToEmployer(employeeId, employerId) {
  const row = db
    .prepare(
      `SELECT 1 FROM applications
       JOIN jobs ON jobs.id = applications.job_id
       WHERE applications.employee_id = ? AND jobs.employer_id = ?
       LIMIT 1`
    )
    .get(employeeId, employerId);
  return !!row;
}

// View another user's profile. Phone is only included if:
// - it's the viewer's own profile, or
// - the viewer is an employer who has unlocked this employee's contact
//   (paid), or
// - the viewer is an employer and this employee has applied to one of
//   their jobs (free — the worker initiated contact).
router.get('/:id', requireAuth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  let includePhone = target.id === req.user.id;
  if (!includePhone && req.user.account_type === 'employer' && target.account_type === 'employee') {
    const unlock = db
      .prepare('SELECT id FROM contact_unlocks WHERE employer_id = ? AND employee_id = ?')
      .get(req.user.id, target.id);
    includePhone = !!unlock || hasAppliedToEmployer(target.id, req.user.id);
  }

  const blockedByMe =
    target.id === req.user.id
      ? false
      : !!db
          .prepare('SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?')
          .get(req.user.id, target.id);

  res.json({ user: { ...serializeUser(target, { includePhone }), blockedByMe } });
});

// Browse candidates (employees) with filters — employer only in practice,
// but not enforced server-side since the data isn't sensitive besides phone.
router.get('/', requireAuth, (req, res) => {
  const {
    profession,
    location,
    gender,
    minAge,
    maxAge,
    minYearsExperience,
    educationLevel,
    availability,
    maxExpectedSalary,
    language,
    verifiedOnly,
    q,
  } = req.query;

  const clauses = [
    `account_type = 'employee'`,
    `id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = @viewerId)`,
    `id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = @viewerId)`,
  ];
  const params = { viewerId: req.user.id };

  if (profession) {
    clauses.push('profession LIKE @profession');
    params.profession = `%${profession}%`;
  }
  if (location) {
    clauses.push('location LIKE @location');
    params.location = `%${location}%`;
  }
  if (gender) {
    clauses.push('gender = @gender');
    params.gender = gender;
  }
  if (minAge) {
    clauses.push('age >= @minAge');
    params.minAge = Number(minAge);
  }
  if (maxAge) {
    clauses.push('age <= @maxAge');
    params.maxAge = Number(maxAge);
  }
  if (minYearsExperience) {
    clauses.push('years_experience >= @minYearsExperience');
    params.minYearsExperience = Number(minYearsExperience);
  }
  if (educationLevel) {
    clauses.push('education_level = @educationLevel');
    params.educationLevel = educationLevel;
  }
  if (availability) {
    clauses.push('availability = @availability');
    params.availability = availability;
  }
  if (maxExpectedSalary) {
    clauses.push('(expected_salary IS NULL OR expected_salary <= @maxExpectedSalary)');
    params.maxExpectedSalary = Number(maxExpectedSalary);
  }
  if (language) {
    clauses.push('languages LIKE @language');
    params.language = `%${language}%`;
  }
  if (verifiedOnly === 'true') {
    clauses.push('verified = 1');
  }
  if (q) {
    clauses.push('(name LIKE @q OR profession LIKE @q OR bio LIKE @q)');
    params.q = `%${q}%`;
  }

  const rows = db
    .prepare(
      `SELECT * FROM users WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 200`
    )
    .all(params);

  const unlockedIds = new Set(
    req.user.account_type === 'employer'
      ? db
          .prepare('SELECT employee_id FROM contact_unlocks WHERE employer_id = ?')
          .all(req.user.id)
          .map((r) => r.employee_id)
      : []
  );
  const appliedIds = new Set(
    req.user.account_type === 'employer'
      ? db
          .prepare(
            `SELECT DISTINCT applications.employee_id
             FROM applications
             JOIN jobs ON jobs.id = applications.job_id
             WHERE jobs.employer_id = ?`
          )
          .all(req.user.id)
          .map((r) => r.employee_id)
      : []
  );

  res.json({
    candidates: rows.map((u) =>
      serializeUser(u, { includePhone: unlockedIds.has(u.id) || appliedIds.has(u.id) })
    ),
  });
});

module.exports = router;
