# AGENTS.md — StartupsClub API (backend)

The single source of truth for every AI coding agent working in this repository (Claude Code and
others). `CLAUDE.md` imports it. Read it fully before any task.

## 1. What this repository is

The **backend** of StartupsClub, an accountability and community platform for startup founders and
developers. It is a NestJS REST API (a modular monolith) with PostgreSQL through Prisma 7. The
Next.js frontend lives in a separate repository (`startupsclub-web`) and talks to this API only
over HTTP. One developer owns and approves everything here: Uneeb Bhatti.

**This repository is public.** Everything committed here is visible to everyone.

## 2. Rule zero: do not assume, ask

- If anything is unclear, missing or open to more than one reading, **stop and ask the owner**
  before writing code (Claude Code: `AskUserQuestion`). There is no "reasonable default" exception.
- Never invent endpoints, fields, tables, business rules, limits, error codes, environment
  variables, libraries, folders or patterns. If the documents do not cover it, it is a question.
- Items marked **OPEN** or **TO CONFIRM** in `docs/DECISIONS.md` must be asked about before use.

## 3. Order of authority

1. The owner's latest explicit instruction.
2. This file and `SECURITY.md`.
3. The documents in `docs/` (map in section 12).
4. Library documentation and generated code. These are inputs, not authority.

## 4. Hard rules (never break)

1. **Never read, print, search or edit any `.env*` file** except `.env.example`. Ask the owner for
   values. Enforced in `.claude/settings.json`.
2. **Never commit to `main` or `integration`.** Work only on a `feature/<feature_name>` branch
   (lowercase letters, digits, hyphens). `feature/*` → PR → `integration` → PR → `main`.
3. **Never use the type `any`** (explicit or `as any`). Use precise types, generics, or `unknown`
   with narrowing. No `@ts-ignore`. `@ts-expect-error` needs a written reason and approval.
4. **Never bypass checks:** no `--no-verify`, no inline rule disabling, no editing CI, Husky or
   test thresholds to make a failure pass, no skipping or deleting a failing test.
5. **Never create architecture by yourself.** Modules follow the default NestJS layout described
   in `docs/ARCHITECTURE.md`. No new top-level folder, layer, pattern or dependency without approval.
6. **Never change the database by hand.** Schema changes go through `prisma/schema.prisma` and a
   migration created with `prisma migrate dev`. Never edit an applied migration, never run
   `migrate reset`, `db push` or raw destructive SQL against staging or production.
7. **Never expose secrets or personal data.** No secrets in code, logs, tests, fixtures, error
   messages, Sentry events or Docker images. No real emails or names in seed or test data.
8. **Never deploy by hand.** Deployment happens only through the pipeline after a merge
   (`docs/DEPLOYMENT.md`).
9. **Never weaken security controls** (validation, rate limits, CORS, Helmet, auth guards) and never
   remove error reporting. Sentry is the approved monitoring tool; no other telemetry without approval.

## 5. Required code conventions

- **TSDoc file header.** Every `.ts` source file has a TSDoc block **immediately after its
  imports** saying what the file is for, using `@packageDocumentation`:

  ```ts
  import { Injectable } from "@nestjs/common";

  /**
   * Business logic for the waitlist: stores a signup once and never reveals whether an email
   * was already registered.
   *
   * @packageDocumentation
   */
  ```

  Generated files (Prisma client, migrations) are exempt.

- **Strict TypeScript.** Explicit return types on exported functions and all controller and
  service methods. `import type` for type-only imports.
- **Thin controllers.** Controllers validate input and call a service. Business logic lives in
  services. Only services (and the Prisma module) touch the database.
- **DTOs for every request body, query and params**, validated with `class-validator`. The global
  `ValidationPipe` uses `whitelist`, `forbidNonWhitelisted` and `transform`.
- **Never return Prisma models directly.** Map to a response DTO so new columns cannot leak.
- **One response shape:** `{ data, meta }` on success, `{ error: { code, message, details } }` on
  failure (`docs/API_CONVENTIONS.md`).
- **Errors:** throw NestJS HTTP exceptions with a stable error `code`. Never leak stack traces,
  SQL, or internal messages to clients.
- **Formatting:** Prettier decides. Comments explain why, not what. No commented-out code.
- Full detail: `docs/ARCHITECTURE.md` and `docs/API_CONVENTIONS.md`.

## 6. Database rules (Prisma 7)

- Prisma 7 is an ES module and needs a driver adapter, a `prisma.config.ts` and an explicit client
  `output` (`docs/DATABASE.md`). It does **not** auto-run `generate` or seeding after a migration;
  run them explicitly.
- Import the client only from the generated path through `PrismaService`. Never create a second
  `PrismaClient`.
- Every migration must be **backward compatible** with the code already running, because the
  pipeline migrates before it deploys (expand first, contract in a later release).
- Use transactions for multi-step writes. Add an index for every foreign key and lookup column.
- Times are stored in UTC.

## 7. Testing

- Every service has unit tests; every endpoint has an end-to-end test (`docs/TESTING.md`).
- Write or update tests in the same change as the code. A change is not done until tests pass.
- Tests never call real third parties and never use real personal data.

## 8. Before you say a task is done

Run and report each result:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e      # needs the Docker database running
npm run build
```

Then update `docs/PROGRESS.md`, and `docs/DECISIONS.md` if a decision was made. If an endpoint
changed, update the OpenAPI decorators and `docs/API_CONVENTIONS.md` or the feature document.

## 9. Git workflow

- Branch from `integration`: `feature/<feature_name>`. Open a pull request into `integration`.
- Only `integration` may be merged into `main`. A feature branch must never target `main`.
- Never commit or push unless the owner asks. Never force-push a shared branch.
- Husky blocks commits on `main`, `integration` and badly named branches, then runs Prettier
  (writes) and ESLint on staged files on commit, and the type check on push. CI repeats everything
  (and runs the tests) and is the real gate.

## 10. Security

Read `SECURITY.md`. Public endpoints are rate limited and validated. CORS allows only configured
origins. Third-party tokens (LinkedIn, GitHub) are stored encrypted. Webhooks are verified by
signature. Logs and Sentry events carry opaque IDs only.

## 11. Current phase

**Phase 1: project foundation, pipeline and the waitlist API** (`docs/WAITLIST.md`,
`docs/ROADMAP.md`), plus authentication started by the owner on 2026-11-17: better-auth with
email and password and GitHub sign-in (`docs/AUTH.md`). Redis and BullMQ, LinkedIn, the GitHub
App and the AI layer are designed but **not installed yet**. Do not add them until the owner
starts that phase.

## 12. Document map

| Need                              | Read                                                     |
| --------------------------------- | -------------------------------------------------------- |
| What we are building              | `docs/PRD.md`, `docs/REQUIREMENTS.md`, `docs/ROADMAP.md` |
| Stack, scripts, tooling           | `docs/TRD.md`, `docs/ENVIRONMENT.md`                     |
| Code structure                    | `docs/ARCHITECTURE.md`                                   |
| Endpoints and response rules      | `docs/API_CONVENTIONS.md`                                |
| Database and migrations           | `docs/DATABASE.md`                                       |
| Phase 1 feature                   | `docs/WAITLIST.md`                                       |
| Sign-in                           | `docs/AUTH.md`                                           |
| LinkedIn and GitHub (later phase) | `docs/INTEGRATIONS.md`                                   |
| Scheduled work (later phase)      | `docs/JOBS.md`                                           |
| Tests                             | `docs/TESTING.md`                                        |
| Errors and monitoring             | `docs/MONITORING.md`                                     |
| Branches, Docker, CI/CD, Render   | `docs/DEPLOYMENT.md`, `CONTRIBUTING.md`                  |
| Status and decisions              | `docs/PROGRESS.md`, `docs/DECISIONS.md`                  |
