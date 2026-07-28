require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');

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

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

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
});
