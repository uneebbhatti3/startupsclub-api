# Decisions

Decisions made by the owner, newest first. Earlier decisions are recorded in `docs/PROGRESS.md`.

## 2026-11-17 — Authentication (`feature/waitlist`)

| Decision                 | Choice                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Library                  | better-auth 1.7 with `@thallesp/nestjs-better-auth` (the better-auth NestJS guide).      |
| Sign-in methods          | Email and password (sign-up with name, email, password) and GitHub. Google is not added. |
| Route protection         | Global `AuthGuard`; public routes are marked `@AllowAnonymous()`.                        |
| Email verification       | Required before email sign-in; sent through the existing Resend `MailService`.           |
| Verification redirect    | To the `callbackURL` the frontend sends at sign-up (must be a trusted origin).           |
| After verification       | Signed in automatically; an unverified sign-in attempt resends the link.                 |
| Password and link limits | better-auth defaults: password 8 to 128 characters, link valid 1 hour.                   |
| Table naming             | snake_case tables and columns (`users`, `sessions`, `accounts`, `verifications`).        |
| Trusted origins          | The CORS list, shared from `src/common/allowed-origins.ts`.                              |
| GitHub tokens            | Encrypted at rest (`encryptOAuthTokens`), as `SECURITY.md` requires.                     |
| better-auth telemetry    | Off.                                                                                     |

**OPEN:** session cookie attributes for staging and production (`docs/AUTH.md` section 6).
