const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { newId } = require('../utils/ids');
const { serializeUser } = require('../utils/serialize');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

router.post('/register', async (req, res) => {
  const {
    accountType,
    phone,
    password,
    name,
    age,
    gender,
    location,
    bio,
    profession,
    yearsExperience,
    experienceDescription,
    educationLevel,
    languages,
    skills,
    availability,
    expectedSalary,
    portfolio,
    companyName,
    lookingFor,
    requirements,
    payOffered,
    companyDescription,
  } = req.body;

  if (!['employee', 'employer'].includes(accountType)) {
    return res.status(400).json({ error: 'Tipo de conta inválido.' });
  }
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 9) {
    return res.status(400).json({ error: 'Número de telefone inválido.' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'O nome é obrigatório.' });
  }
  if (accountType === 'employee') {
    if (!age) return res.status(400).json({ error: 'A idade é obrigatória.' });
    if (!profession || !String(profession).trim()) {
      return res.status(400).json({ error: 'A profissão/sector procurado é obrigatório.' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
  if (existing) {
    return res.status(409).json({ error: 'Já existe uma conta com este número de telefone.' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const id = newId('user');

  db.prepare(
    `INSERT INTO users (
      id, phone, password_hash, account_type, name, age, gender, location, bio,
      profession, years_experience, experience_description, education_level, languages, skills,
      availability, expected_salary, portfolio,
      company_name, looking_for, requirements, pay_offered, company_description
    ) VALUES (
      @id, @phone, @passwordHash, @accountType, @name, @age, @gender, @location, @bio,
      @profession, @yearsExperience, @experienceDescription, @educationLevel, @languages, @skills,
      @availability, @expectedSalary, @portfolio,
      @companyName, @lookingFor, @requirements, @payOffered, @companyDescription
    )`
  ).run({
    id,
    phone: normalizedPhone,
    passwordHash,
    accountType,
    name: String(name).trim(),
    age: age ? Number(age) : null,
    gender: gender || null,
    location: location || null,
    bio: bio || null,
    profession: accountType === 'employee' ? profession || null : null,
    yearsExperience: accountType === 'employee' && yearsExperience ? Number(yearsExperience) : null,
    experienceDescription: accountType === 'employee' ? experienceDescription || null : null,
    educationLevel: accountType === 'employee' ? educationLevel || null : null,
    languages: accountType === 'employee' ? JSON.stringify(languages || []) : null,
    skills: accountType === 'employee' ? JSON.stringify(skills || []) : null,
    availability: accountType === 'employee' ? availability || null : null,
    expectedSalary: accountType === 'employee' && expectedSalary ? Number(expectedSalary) : null,
    portfolio: accountType === 'employee' ? portfolio || null : null,
    companyName: accountType === 'employer' ? companyName || null : null,
    lookingFor: accountType === 'employer' ? lookingFor || null : null,
    requirements: accountType === 'employer' ? requirements || null : null,
    payOffered: accountType === 'employer' ? payOffered || null : null,
    companyDescription: accountType === 'employer' ? companyDescription || null : null,
  });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(id);
  res.status(201).json({ token, user: serializeUser(user, { includePhone: true }) });
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  const normalizedPhone = normalizePhone(phone);
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone);
  if (!user) return res.status(401).json({ error: 'Telefone ou palavra-passe incorretos.' });

  const ok = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Telefone ou palavra-passe incorretos.' });

  const token = signToken(user.id);
  res.json({ token, user: serializeUser(user, { includePhone: true }) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: serializeUser(req.user, { includePhone: true }) });
});

module.exports = router;
