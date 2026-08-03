# Emprego Já — Mobile App

React Native app (Expo managed workflow) for Emprego Já, a mobile-only job
marketplace connecting job seekers ("Candidatos") and employers
("Empregadores") in Mozambique. iOS and Android only — there is no web
build target.

Payments are handled via ZumboPay (M-Pesa, e-Mola, and card). Posting a job
(100 MZN, +50 MZN optional boost to sort above other jobs), applying to a job
(50 MZN), and unlocking a candidate's contact (50 MZN) all require a
confirmed payment — see `backend/src/routes/payments.js`. Posting a Story
remains free.

## Running locally (Expo Go)

Requirements: Node.js 18+, the [Expo Go](https://expo.dev/go) app on your
phone (or an iOS/Android simulator), and the backend running somewhere
reachable from your phone (see `../backend/README.md`).

```bash
cd mobile
npm install
cp .env.example .env
```

Edit `.env` and point `EXPO_PUBLIC_API_URL` at your backend:

- Simulator on the same machine as the backend: `http://localhost:4000` works.
- Physical phone with Expo Go: use your computer's LAN IP instead of
  `localhost`, e.g. `http://192.168.1.42:4000` (phone and computer must be
  on the same Wi-Fi network).
- A deployed backend: use its public HTTPS URL.

Then start the dev server:

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## Pointing at a deployed backend

Nothing in the code is hardcoded — the app only ever reads
`EXPO_PUBLIC_API_URL` (via `src/api/client.js`). To point a build at a
deployed backend:

- **Local dev**: edit `.env` as above.
- **EAS builds**: edit the `env.EXPO_PUBLIC_API_URL` value for the relevant
  profile in `eas.json` (`preview` / `production`) before building.

## Push notifications

Push uses Expo's push service directly — no separate Firebase project is
needed. On login/register, the app requests notification permission and
registers the device's Expo push token with the backend
(`POST /notifications/push-token`). Push tokens only work on physical
devices, not simulators.

For push to work in a standalone/EAS build, set a real `extra.eas.projectId`
in `app.json` (create the project with `eas init` — see below).

## Producing a real installable app (EAS Build)

Everything above runs the app through Expo Go — useful for development, but
not a real installable app. EAS Build compiles an actual `.apk` (Android) or
`.ipa` (iOS) file. This is a one-time setup, then a build any time you want a
fresh installable version. No app-store account or fee is required just to
produce and install a `preview` build — that's only needed for actually
publishing to the Play Store / App Store later.

Steps (Command Prompt on Windows, from the `mobile` folder):

1. **Create a free Expo account** at [expo.dev](https://expo.dev) (Sign Up).
2. **Log in from the terminal:**
   ```
   npx eas login
   ```
   Enter the email/password from step 1.
3. **Link this project to your account** (only needed once ever — it fills
   in `extra.eas.projectId` in `app.json`):
   ```
   npx eas init
   ```
   Confirm with `y`. Save the project ID it prints — if you ever start from
   a fresh download of this repo, that ID needs to be in `app.json` (either
   re-run `eas init`, or paste the ID back in).
4. **Build:**
   ```
   npx eas build --platform android --profile preview
   ```
   Takes ~10-15 minutes (runs on Expo's servers, not your PC). The `preview`
   profile already points at the live backend
   (`https://empregoja-api.onrender.com`, set in `eas.json`) and produces a
   directly-installable `.apk` — no store submission needed.
   Add `--platform ios` for an iOS build (needs an Apple Developer account
   to sign, unlike Android).
5. **Install on a phone:** open the link/QR code EAS gives you when the
   build finishes, download the `.apk`, and install it (Android will warn
   about "install from unknown sources" — allow it for this file). This is
   the real, standalone app — icon and all, not the Expo Go preview.

When you're ready to actually launch publicly, switch to the `production`
build profile and submit it through the Play Console / App Store Connect —
that's the step that needs the $25 Google Play / $99-per-year Apple
developer accounts.

## Project structure

```
App.js                     — app entrypoint (providers, gesture handler root)
src/
  api/client.js             — fetch wrapper, reads EXPO_PUBLIC_API_URL, attaches JWT
  context/AuthContext.js     — session state, login/register/logout
  context/StoriesContext.js  — shared active-stories feed
  navigation/                — RootNavigator, Auth/Employee/Employer navigators
  screens/auth/               Welcome, Register (permanent account-type choice), Login
  screens/employee/           Home feed, search, job detail, my applications
  screens/employer/           Vagas/Candidatos home, candidate search, post job,
                               candidate detail (unlock/WhatsApp/message), notifications
  screens/shared/              Profile, edit profile, notifications, story viewer/creator
  components/                 Avatar (story-ring gradient), JobCard, CandidateCard, ...
  theme/colors.js              Palette: navy / gold / coral / teal
```
