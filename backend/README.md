# Emprego Já — Backend

Node.js + Express API for the Emprego Já mobile app, backed by a persistent
SQLite database (Node's built-in `node:sqlite`). JWT auth (bcryptjs password
hashing), photo uploads served from disk, and real Expo push notifications.
No native/C++ compiler is required to install this — every dependency is
pure JavaScript or built into Node itself.

No payment processing is implemented. Every route that will eventually cost
money is marked with a `// TODO(payment): ...` comment describing the charge
that should be required there once M-Pesa/eMola/mKesh integration is added.

## Running locally

Requirements: Node.js 22.5+ (for the built-in `node:sqlite` module — check
with `node --version`; no other native build tools are needed).

```bash
cd backend
npm install
cp .env.example .env   # then edit JWT_SECRET to a real random value
npm run dev             # auto-restarts on file changes (node --watch)
# or: npm start
```

The server listens on `PORT` (default `4000`). Check it's up:

```bash
curl http://localhost:4000/health
```

The SQLite file and uploaded photos are written to `DATA_DIR` (default
`./data`, gitignored) — nothing is stored in memory, so data survives
restarts.

## Environment variables

See `.env.example` for the full list:

- `PORT` — port Express listens on.
- `JWT_SECRET` — required; long random string used to sign session tokens.
- `JWT_EXPIRES_IN` — session token lifetime (default `30d`).
- `DATA_DIR` — where the SQLite file and `/uploads` photos are persisted.
  On Render/Railway, point this at a mounted persistent disk so uploads and
  the database survive deploys.
- `PUBLIC_BASE_URL` — optional. The server auto-detects the correct base URL
  for absolute photo URLs from each request's own Host header (so it works
  automatically whether you're hitting it via `localhost`, a LAN IP, or the
  public Render domain). Only set this to force a specific value.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — optional; used to
  email Customer Support / report submissions. Without these, submissions
  are still saved to the database but no email is sent (a warning is logged).
- `SUPPORT_EMAIL_TO` — optional, defaults to `alecerchia6@gmail.com`. Where
  support submissions are emailed.

### Setting up support-ticket email with Gmail (no new account needed)

1. Go to your Google Account → **Security** → turn on **2-Step Verification**
   if it isn't already on.
2. Go to https://myaccount.google.com/apppasswords, sign in, create an app
   password (any name, e.g. "Emprego Já"). Google shows a 16-character code
   — copy it.
3. In `.env`, set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-gmail-address@gmail.com
   SMTP_PASS=the-16-character-app-password
   ```
4. Restart the backend. Submitting a Customer Support report in the app
   should now arrive by email.

Any other SMTP provider works the same way — just point `SMTP_HOST` /
`SMTP_PORT` at it instead of Gmail's.

No code changes are needed to deploy — everything is env-var driven.

## Deploying (Render / Railway / a VPS)

A `render.yaml` Blueprint is included at the repo root, so on Render you can
skip the manual steps below: **New +** → **Blueprint** → select this repo →
Render reads `render.yaml` and provisions the `empregoja-api` web service
with a 1GB persistent disk, an auto-generated `JWT_SECRET`, and
`PUBLIC_BASE_URL` already set to `https://empregoja-api.onrender.com`. If you
rename the service, update `PUBLIC_BASE_URL` in `render.yaml` to match.

Manual steps (Render without the Blueprint, Railway, or a VPS):

1. Push this `backend/` folder as (or push the whole repo, using `backend`
   as the service root / working directory).
2. Build command: `npm install`. Start command: `npm start`.
3. Attach a persistent disk and set `DATA_DIR` to a path on it (e.g.
   `/var/data`), otherwise uploaded photos and the DB are lost on redeploy.
4. Set `JWT_SECRET` (random secret) as an environment variable.
   `PUBLIC_BASE_URL` is optional (see above) and doesn't need to be set.
5. Point the mobile app's `EXPO_PUBLIC_API_URL` at that same public URL.

## API overview

All endpoints except `/health`, `/auth/register`, `/auth/login` require
`Authorization: Bearer <token>`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /users/:id`, `PATCH /users/me`, `POST /users/me/photo`, `GET /users`
  (candidate search/filter)
- `POST /jobs`, `GET /jobs` (search/filter), `GET /jobs/mine`, `GET /jobs/:id`,
  `POST /jobs/:id/report`
- `POST /applications`, `GET /applications/mine`, `GET /applications/job/:jobId`,
  `GET /applications/received`
- `POST /unlocks`, `GET /unlocks`
- `GET /notifications`, `POST /notifications/:id/read`,
  `POST /notifications/read-all`, `POST /notifications/push-token`
- `POST /stories`, `GET /stories` (only non-expired, enforced in SQL),
  `DELETE /stories/:id`

## Notes on scope

- Payments (M-Pesa/eMola/mKesh) are intentionally not implemented. Search the
  codebase for `TODO(payment)` to find every hook point.
- `verified` on a user is a plain boolean column with no route to set it yet
  — flip it directly in the DB for now, as a stand-in for a future manual/
  admin verification process.
