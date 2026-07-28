# Emprego Já — Backend

Node.js + Express API for the Emprego Já mobile app, backed by a persistent
SQLite database (`better-sqlite3`). JWT auth, bcrypt password hashing, photo
uploads served from disk, and real Expo push notifications.

No payment processing is implemented. Every route that will eventually cost
money is marked with a `// TODO(payment): ...` comment describing the charge
that should be required there once M-Pesa/eMola/mKesh integration is added.

## Running locally

Requirements: Node.js 18+ (native build tools — `python3`, `make`, `g++` —
are needed the first time, to compile `better-sqlite3` and `bcrypt`).

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
- `PUBLIC_BASE_URL` — the backend's own public URL, used to build absolute
  photo URLs (e.g. `https://empregoja-api.onrender.com`) returned to the app.

No code changes are needed to deploy — everything is env-var driven.

## Deploying (Render / Railway / a VPS)

1. Push this `backend/` folder as (or push the whole repo, using `backend`
   as the service root / working directory).
2. Build command: `npm install`. Start command: `npm start`.
3. Attach a persistent disk and set `DATA_DIR` to a path on it (e.g.
   `/var/data`), otherwise uploaded photos and the DB are lost on redeploy.
4. Set `JWT_SECRET` (random secret) and `PUBLIC_BASE_URL` (the service's
   public HTTPS URL) as environment variables.
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
