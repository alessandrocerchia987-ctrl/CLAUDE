require('dotenv').config();

// Last-resort safety net: a single unhandled error anywhere (an async route
// handler that throws without try/catch, a background job, etc.) used to
// crash the entire process — taking down the server for every user until
// Render restarted it, and silently dropping whatever request or webhook was
// in flight (this is what happened with a malformed ZumboPay webhook payload
// crashing payment confirmation). Logging and continuing instead means one
// bad request can no longer bring the whole app down. This does not replace
// fixing the underlying bug — it just stops one bug from becoming an outage.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const { withRequestContext } = require('./utils/requestContext');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set a real secret.');
  process.exit(1);
}

require('./db'); // ensures schema is created before routes are mounted

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const unlockRoutes = require('./routes/unlocks');
const notificationRoutes = require('./routes/notifications');
const storyRoutes = require('./routes/stories');
const supportRoutes = require('./routes/support');
const paymentRoutes = require('./routes/payments');
const legalRoutes = require('./routes/legal');
const { startStoryCleanupSchedule } = require('./utils/cleanupStories');
const { startJobExpiryWarningSchedule } = require('./utils/notifyExpiringJobs');

const app = express();
app.set('trust proxy', true);
app.use(cors());
// `verify` stashes the exact raw bytes on req.rawBody — needed to check
// ZumboPay's webhook signature, which is computed over the raw body, not
// the parsed object.
app.use(express.json({ limit: '5mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(withRequestContext);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/health', (req, res) => res.json({ ok: true, service: 'emprego-ja-backend' }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/unlocks', unlockRoutes);
app.use('/notifications', notificationRoutes);
app.use('/stories', storyRoutes);
app.use('/support', supportRoutes);
app.use('/payments', paymentRoutes);
app.use('/', legalRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Emprego Já backend a correr na porta ${PORT}`);
  startStoryCleanupSchedule();
  startJobExpiryWarningSchedule();
});
