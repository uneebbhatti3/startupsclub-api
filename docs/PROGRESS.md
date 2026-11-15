# Progress

## 2026-11-14 — Prisma 7 and the global Prisma module (`feature/setup`)

**Done**

- Installed and pinned: `prisma` 7.10.1 (dev), `@prisma/client` 7.10.1, `@prisma/adapter-pg`
  7.10.1, `pg` 8.23.1, `dotenv` 18.0.10, `@types/pg` 8.23.1 (dev). Node used locally: 24.18.0.
- `prisma/schema.prisma` (no models yet), `prisma.config.ts`, and the scripts `db:generate`,
  `db:migrate`, `db:deploy` and `db:seed`.
- `src/prisma/prisma.service.ts` and `src/prisma/prisma.module.ts` (`@Global()`), imported in
  `AppModule`.
- `src/main.ts` loads `.env` via `dotenv/config` for local runs.
- Generated client in `generated/prisma` at the project root (git-ignored). `tsconfig.build.json`
  uses `rootDir: "."` and includes `generated`, so the build outputs `dist/src/main.js`.
- Tests: `src/prisma/prisma.service.spec.ts` (unit), `test/prisma.e2e-spec.ts` (`SELECT 1`).
- `docs/DATABASE.md` written.

**Decisions (owner, 2026-11-14)**

- Stay CommonJS: generator `moduleFormat = "cjs"` and `importFileExtension = ""` (bare imports,
  so Jest resolves the generated client without config changes). This resolves the module-format
  risk in `docs/TRD.md` section 2 for dev, unit tests and the build.
- `PrismaService` reads `process.env.DATABASE_URL` until `@nestjs/config` is added.
- Local e2e runs use `DATABASE_URL` from the shell, pointing at the `_test` database.

**Not verified yet**

- `npm run test:e2e` against the local `_test` database (needs the owner's shell `DATABASE_URL`).
- Docker image build and run.

**Gaps found**

- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/WAITLIST.md` and the other documents in the
  `AGENTS.md` map do not exist yet.
- `lint` uses oxlint, not ESLint as the TRD describes, and `.oxlintrc.json` turns
  `no-explicit-any` off, which conflicts with AGENTS.md hard rule 3.
- The `format` script still writes only `src/` and `test/`; TRD section 4 says `prettier --write .`.

## 2026-11-14 — Local CI script (`feature/setup`)

**Done**

- Added `format:check` (`prettier --check .`) and `typecheck` (`tsc --noEmit`) from TRD section 4.
  `.github/workflows/ci.yml` already called both.
- Added `ci:check`: `db:generate`, `format:check`, `lint`, `typecheck`, `test`, `test:e2e`,
  `build`, in the AGENTS.md section 8 order. Needs Docker and `DATABASE_URL` set to the `_test`
  database.
- Prettier: kept `.prettierrc.json` (double quotes, width 100) and deleted `.prettierrc` (owner's
  decision). Added `package-lock.json` to `.prettierignore`. Reformatted the repository once
  (formatting only, including `.github/workflows/ci.yml`).

**Verified:** `db:generate`, `format:check`, `lint`, `typecheck`, `test` (3/3) and `build` all pass.
**Not verified:** the `test:e2e` step of `ci:check`.

## 2026-11-14 — Node 24 everywhere (`feature/setup`)

**Why:** NestJS 12 (`@nestjs/common`, `@nestjs/core`, `@nestjs/testing`) is ESM-only. The project is
CommonJS, so ts-jest turns test imports into `require`. Jest only allows `require` of an ES module on
Node 24.9+. Local runs (Node 24.18) passed, but CI on Node 22 failed every suite before any test ran.

**Done (owner approved the CI edit):** `node-version: 24` in `.github/workflows/ci.yml` (5 jobs) and
`deploy.yml`, `node:24-alpine` in both Dockerfile stages, `"engines": { "node": ">=24.9" }` in
`package.json`, and the runtime row in `docs/TRD.md`.

**Not verified:** a CI run on Node 24 and the Docker image build (need a push).

## 2026-11-14 — Waitlist table (`feature/waitlist`)

**Done:** `WaitlistRole` enum and `WaitlistEntry` model in `prisma/schema.prisma`, migration
`20261114161459_add_waitlist_entries` (new enum and table only, backward compatible), applied to the
local development database; client regenerated; `docs/DATABASE.md` section 6.

**Decisions (owner):** role is an enum plus optional `roleOther` text; email unique and stored
lowercase (service rule); snake_case table and columns; `cuid()` ids; `TIMESTAMPTZ(3)` timestamps;
lengths name 100, email 254, roleOther 50.

**Verified:** `format:check`, `lint`, `typecheck`, `test:e2e` (2/2), `build`.
**Failing (not part of this change):** `npm run test` fails on `test/health-e2e.spec.ts`. It is
named like a unit test, so it runs without `.env.test`, and there is no `/health` route in `src/`.

**Next:** waitlist module (DTOs, service, controller, tests) once `docs/WAITLIST.md` exists.

## 2026-11-14 — Waitlist API and global HTTP setup (`feature/waitlist`)

**Done**

- Installed `class-validator` 0.15.1, `class-transformer` 0.5.1, `@nestjs/throttler` 6.7.1 and
  `@nestjs/swagger` 12.1.2 (install script of `@scarf/scarf`, a Swagger UI usage tracker, stays
  blocked).
- `src/common/`: `configureApp()` (shared by `main.ts` and e2e tests) with `trust proxy` 1, `/api`
  prefix (`/health` excluded), URI versioning, the global `ValidationPipe` (`VALIDATION_FAILED`
  with per-field details) and `AllExceptionsFilter` (`{ error: { code, message, details } }`,
  generic 500s).
- Global `ThrottlerGuard`, 100 requests a minute per IP; `/health` skipped.
- Swagger UI at `/api/docs` when `APP_ENV` is `local` or `staging` (never production).
- `src/waitlist/`: `POST /api/v1/waitlist` with controller, service, repository and DTOs
  (`docs/WAITLIST.md`).
- Tests: repository, service, DTO and exception-filter unit tests; `test/waitlist.e2e-spec.ts`
  (201, 409, 400, 429).

**Decisions (owner):** repository layer; 409 `WAITLIST_EMAIL_EXISTS` "Already in the waitlist";
POST only; 5 signups a minute per IP; lowercase roles with strict `roleOther`; 201 returns the
saved entry. See `docs/WAITLIST.md` section 3.

**To verify:** `trust proxy` 1 on the first Render staging deploy (TRD section 7).

## 2026-11-14 — Waitlist welcome email (`feature/waitlist`)

**Done:** `@nestjs/mail` 0.0.2 (pinned exactly; early release). Templates
`src/mail/templates/waitlist-welcome.html` and `.txt`; `AppMailModule` (global) with SMTP in
staging and production and `.eml` files in `var/mail/` elsewhere; `WaitlistWelcomeMail`; the
service sends it without awaiting after a successful insert; `enableShutdownHooks()` in `main.ts`;
template assets in `nest-cli.json`; `MAIL_FROM` and `SMTP_*` in `.env.example` and TRD section 6.
Tests: service (email sent, response not blocked, failure logged without the address), template
(rendering, escaping), e2e (email sent after 201, none on 409, 201 when the email fails).

**Decisions (owner):** simple async over RabbitMQ; SMTP provider; file transport locally,
in-memory in tests; sender from `MAIL_FROM`; copy approved as drafted.

**Verified:** `format:check`, `lint`, `typecheck`, unit tests (32 of 33; the failure is
`test/health-e2e.spec.ts`), `build` (templates in `dist/src/mail/templates`), the built app boots,
and staging refuses to start without SMTP settings.
**Not verified:** waitlist e2e tests (the `_test` database has no migration yet) and a real SMTP
send.

## 2026-11-14 — Real email locally, no local mail files (`feature/waitlist`)

**Decision (owner):** sent emails are never stored on disk. `APP_ENV=local` now sends real email
through SMTP like staging and production (requires `MAIL_FROM` and `SMTP_*` in `.env`); tests and CI
use `InMemoryMailTransport`. Removed the `FileMailTransport`, the `var/` folder and its ignore
entries.

## 2026-11-15 — Resend replaces SMTP (`feature/waitlist`)

**Decision (owner):** send email through Resend on the verified `startupsclub.one` domain, sender
`hello@startupsclub.one`. Uses the `ResendTransport` built into `@nestjs/mail` (HTTP API, no new
dependency). `SMTP_*` variables removed; `RESEND_API_KEY` added (`.env.example`, TRD section 6).
Tests and CI still use `InMemoryMailTransport`.

## 2026-11-15 — Welcome email uses the Resend-designed template (`feature/waitlist`)

The owner's Resend template HTML replaces `src/mail/templates/waitlist-welcome.html` (`{{{NAME}}}`
→ `{{name}}`, escaped); `.txt` rewritten to the same copy. Kept in the repo and rendered by
`@nestjs/mail` rather than sent by template ID, so retries, shutdown draining and template tests
stay. Subject unchanged.

## 2026-11-15 — Sender shows "StartupsClub" (`feature/waitlist`)

Inboxes showed "hello" because `MAIL_FROM` held a bare address. `toSender()` in
`src/mail/mail.config.ts` now adds the display name "StartupsClub" to a bare address and keeps a
`Name <address>` value as written. Unit tests in `src/mail/mail.config.spec.ts`. The template HTML
the owner re-shared matches the file already in the repo, so it is unchanged.

## 2026-11-15 — Welcome email sent from the Resend template by ID (`feature/waitlist`)

**Decision (owner):** use the published Resend template, not a copy in the repo, sent by template
ID. Added `resend` 6.38.1 (pinned); removed `@nestjs/mail`, the local templates, the template asset
copy in `nest-cli.json` and `MAIL_FROM`. New: `EmailSender` (Resend and in-memory), `MailService`
(retries with an idempotency key, waits for sends on shutdown), `RESEND_WELCOME_TEMPLATE_ID`. The
sender name and subject now come from the template. `jest.setups.ts` forces `APP_ENV=test` so e2e
tests never call Resend.

**Verified:** `format:check`, `lint`, `typecheck`, unit tests (48 of 49; the failure is
`test/health-e2e.spec.ts`), e2e tests (10 of 10, including waitlist), `build`.
**Not verified:** a real send through Resend (needs `RESEND_WELCOME_TEMPLATE_ID` in `.env`).

## 2026-11-15 — Welcome email subject sent from code (`feature/waitlist`)

The API sends `WAITLIST_WELCOME_SUBJECT` ("You're on the StartupsClub waitlist 🚀") with each
email, which overrides the template's subject (Resend send API). Sender and body still come from the template. CORS: removed the trailing slash from
`https://www.startupsclub.one` in `src/main.ts` (browsers send the origin without one).
**Verified:** format, lint, typecheck, unit (48 of 49, `test/health-e2e.spec.ts` as before), e2e
(10 of 10), build. **Not verified:** a real send after the change.

## 2026-11-15 — Welcome email template back in the repo (`feature/waitlist`)

**Decision (owner):** no Resend dashboard template; the email is a template in
`src/mail/templates/` with the same formatting as the Resend design. Added `TemplateRenderer`
(`{{key}}` placeholders, HTML escaping, missing values rejected); `MailService` renders and sends
HTML and text through the `resend` package with `MAIL_FROM` and `WAITLIST_WELCOME_SUBJECT`.
Removed `RESEND_WELCOME_TEMPLATE_ID`; `MAIL_FROM` is back; template assets copied again by
`nest-cli.json`.
**Verified:** format, lint, typecheck, unit (51 of 52, `test/health-e2e.spec.ts` as before), e2e
(10 of 10), build (templates in `dist/src/mail/templates`). **Not verified:** a real send.

## 2026-11-15 — Waitlist count endpoint (`feature/waitlist`)

**Decision (owner):** `GET /api/v1/waitlist/count` returns `{ data: { count } }`, public, global
rate limit, counts every row. Replaced the unfinished `getWaitlist` (it did not type-check) with
`WaitlistRepository.count()` and `WaitlistService.count()`; added `WaitlistCountResponseDto`, unit
tests and two e2e tests. `docs/WAITLIST.md` updated.
**Verified:** format, lint, typecheck, unit (53 of 54, `test/health-e2e.spec.ts` as before), e2e
(12 of 12), build.
