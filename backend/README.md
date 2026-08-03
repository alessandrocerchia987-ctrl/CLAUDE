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
- `ZUMBOPAY_API_KEY` / `ZUMBOPAY_MERCHANT_ID` / `ZUMBOPAY_WALLET_MPESA` /
  `ZUMBOPAY_WALLET_EMOLA` / `ZUMBOPAY_WALLET_CARD` / `ZUMBOPAY_WEBHOOK_SECRET`
  — required for paid actions (e.g. unlocking a contact) to work. Without
  these, the payment request fails with a clear "not configured" error
  instead of the action silently staying free. `ZUMBOPAY_WALLET_CARD` is
  only needed if you want Visa/Mastercard as a payment option — M-Pesa and
  e-Mola work without it. See below for where to find each value.

### Setting up ZumboPay

1. In the ZumboPay Panel → **Developers**, copy your **API Key**
   (`zk_live_...` for production, `zk_test_...` for testing) and
   **Merchant ID** (`MCH_...`).
2. In Panel → **Wallets**, make sure you have an active wallet for each
   payment method you want to accept (M-Pesa, e-Mola, and/or Visa/Mastercard).
   Note: the 6-digit "Wallet ID" shown in that panel is just a
   human-friendly reference — the `wallet_id` the API actually needs is a
   UUID, only returned by calling `GET /wallets`.
3. Still in Panel → Developers, set the **webhook URL** to
   `https://<your-deployed-backend>/payments/webhook` (e.g.
   `https://empregoja-api.onrender.com/payments/webhook`) and enable at
   least the `payment.succeeded` and `payment.failed` events. ZumboPay then
   shows you a **webhook secret** — copy it.
4. Set them all in `.env`:
   ```
   ZUMBOPAY_API_KEY=zk_live_...
   ZUMBOPAY_MERCHANT_ID=MCH_...
   ZUMBOPAY_WALLET_MPESA=...
   ZUMBOPAY_WALLET_EMOLA=...
   ZUMBOPAY_WALLET_CARD=...
   ZUMBOPAY_WEBHOOK_SECRET=...
   ```
5. Restart the backend. Unlocking a contact in the app should now offer
   M-Pesa, e-Mola, and card as payment options.

The current live wallet UUIDs (from `GET /wallets`, dashboard's Merchant ID
`MCH_17E4ABC2CB`), for reference if reconfiguring:

| Method | wallet_code (dashboard) | wallet_id (API) |
|---|---|---|
| M-Pesa | `637348` | `5a4e574a-7f0a-45d7-aa42-214a478411cf` |
| e-Mola | `825274` | `67f12f60-6b48-447a-8671-0b7b490f6db9` |
| Card (Visa/Mastercard) | `151897` | `3a40a29c-6ac6-4a00-902e-6c62a1eaaac4` |

M-Pesa/e-Mola use `POST /charges` (direct phone PIN push, no redirect).
Card uses `POST /payments` (hosted checkout) since ZumboPay's STK push
flow doesn't support cards — the app opens the returned `checkout_url` in
an in-app browser instead of asking for a phone number.

Only `unlock_contact` is wired to a real payment so far — posting a job,
applying, posting a story, and boosting a job are still free (see the
`TODO(payment)` comments in their route files), following the exact same
pattern once you're ready to wire them up too.

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
with an auto-generated `JWT_SECRET` and `PUBLIC_BASE_URL` already set to
`https://empregoja-api.onrender.com`. If you rename the service, update
`PUBLIC_BASE_URL` in `render.yaml` to match.

**Free tier note:** Render's free plan doesn't support persistent disks, so
`render.yaml` doesn't attach one — the SQLite database and uploaded photos
live on the service's regular filesystem, which is wiped whenever the
service redeploys or restarts (including Render's automatic spin-down after
15 minutes of no traffic on the free plan). That's fine for testing/demoing
the app; when you're ready for real users and data that has to survive
restarts, upgrade the service to a paid Render plan and add a disk back (see
the manual steps below), or move to a proper hosted database.

Manual steps (Render without the Blueprint, Railway, or a VPS):

1. Push this `backend/` folder as (or push the whole repo, using `backend`
   as the service root / working directory).
2. Build command: `npm install`. Start command: `npm start`.
3. (Paid plans only) Attach a persistent disk and set `DATA_DIR` to a path
   on it (e.g. `/var/data`), otherwise uploaded photos and the DB are lost
   on every redeploy/restart — see the free tier note above.
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
