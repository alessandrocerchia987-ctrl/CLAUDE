# Emprego Já — Mobile App

React Native app (Expo managed workflow) for Emprego Já, a mobile-only job
marketplace connecting job seekers ("Candidatos") and employers
("Empregadores") in Mozambique. iOS and Android only — there is no web
build target.

No payment processing is implemented yet. Posting a job, applying to a job,
unlocking a candidate's contact, and posting a Story all work for free right
now; search the backend for `TODO(payment)` to see every spot that will need
a confirmed M-Pesa/eMola/mKesh charge later.

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

## Producing an EAS preview build

Install the EAS CLI and log in once:

```bash
npm install -g eas-cli
eas login
```

Link this project to an EAS project (only needed once — this fills in
`extra.eas.projectId` in `app.json`):

```bash
eas init
```

Update `eas.json`'s `preview` (and `production`) profile with your deployed
backend's public URL in `EXPO_PUBLIC_API_URL`, then build:

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

The `preview` profile builds an internally-distributable Android APK (and an
ad-hoc/internal iOS build) you can install directly for testing, without
needing to submit to the App Store / Play Store first.

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
