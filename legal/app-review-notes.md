# App Review Notes — Emprego Já

Paste this (or a trimmed version) into the "App Review Information → Notes" field in App Store Connect when submitting.

## What this app does

Emprego Já is a job marketplace connecting job seekers ("Candidatos") and employers ("Empregadores") in Mozambique. Employers post job listings and search candidate profiles; job seekers browse listings and apply. There is no social/dating aspect — accounts are strictly typed as either a job seeker or an employer at registration.

## Demo accounts for review

- Employer demo account: phone `+258 843895010`, password `123456`
- Job seeker demo account: phone `+258 840113646`, password `123456`

The employer account already has a sample job posted, so the core employer flows are visible without needing to create content from scratch.

## About the paid actions and payment method

Posting a job, applying to a job, and unlocking a candidate's contact details each have a small fee (100 MZN, 50 MZN, and 50 MZN respectively), processed through ZumboPay, a Mozambican payment gateway — not Apple's In-App Purchase. This is intentional and, we believe, compliant with Guideline 3.1.1's exception: these are payments for a real-world service (facilitating a job connection), the same category as Uber, TaskRabbit, or LinkedIn's job-posting fees — not digital content or unlockable app functionality.

**Important for testing the payment flow:** the only payment methods currently offered are M-Pesa and e-Mola, both Mozambican mobile-money services tied to a local phone number — reviewers outside Mozambique will not be able to complete one of these payments themselves. For this reason, the demo accounts above are pre-populated with a sample job posting and a sample application already in place, so the full flow (an employer receiving and viewing an application, unlocking contact details, notifications) is visible without needing to trigger a new payment. We're happy to provide a screen recording of the payment flow itself on request.

## Account deletion

Users can permanently delete their account and all associated data from Profile → "Eliminar conta" ("Delete account"). This is a hard delete, not a deactivation.

## Blocking and reporting

Users can report a job listing (flag icon on the job detail screen) and can block another user they've interacted with (also on the job/candidate detail screen) — blocking hides that user's content from both parties and prevents further contact.

## Permissions

Camera and photo library access are requested only when the user chooses to add a profile photo or a Story photo, with clear in-context purpose strings.

---

## What you still need to do before submitting (Alessandro)

1. ~~Create the two demo accounts~~ — done, see above.
2. ~~Post one sample job from the demo employer account~~ — done. Still worth submitting one sample application from the demo job seeker account when you're back somewhere M-Pesa/e-Mola works, so reviewers can also see the employer's "view applicant" flow without having to create it themselves — not a blocker if it doesn't happen before submission.
3. If Apple pushes back and specifically asks to see a live payment work, the fastest option is sending them a short screen recording of the M-Pesa/e-Mola checkout flow rather than expecting a reviewer to have a Mozambican mobile money account.
