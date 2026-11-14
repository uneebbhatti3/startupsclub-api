# Technical Requirements Document (TRD) — StartupsClub API

## 1. Stack

| Area            | Choice                                        | Notes                                                                            |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Framework       | NestJS (latest stable at scaffold) on Express | Modular monolith. Express, not Fastify (better-auth integration needs it later). |
| Language        | TypeScript, `strict`                          | No `any`.                                                                        |
| Runtime         | Node.js 24 (24.9 or newer)                    | NestJS 12 is ESM-only; Jest can `require` ES modules only on Node 24.9+.         |
| Package manager | npm                                           | Same as the frontend.                                                            |
| Database        | PostgreSQL                                    | Docker `postgres:18-alpine` locally; Neon for staging and production.            |
| ORM             | Prisma **7**                                  | ES module, driver adapter, `prisma.config.ts` (`docs/DATABASE.md`).              |
| Validation      | `class-validator`, `class-transformer`        | NestJS default; global `ValidationPipe`.                                         |
| Configuration   | `@nestjs/config` with a validated schema      | Fail fast on missing variables. Validation library TO CONFIRM.                   |
| API docs        | `@nestjs/swagger` (OpenAPI)                   | Source of the frontend contract.                                                 |
| Security        | `helmet`, `@nestjs/throttler`, strict CORS    |                                                                                  |
| Monitoring      | Sentry (`@sentry/nestjs`)                     | Errors, traces, releases (`docs/MONITORING.md`).                                 |
| Testing         | Jest, Supertest                               | Unit and end-to-end (`docs/TESTING.md`).                                         |
| Quality         | ESLint, Prettier, Husky, lint-staged          |                                                                                  |
| Containers      | Docker, Docker Compose                        | Compose for the local database; a Dockerfile for the API image.                  |
| CI/CD           | GitHub Actions                                | Checks, image build and publish to GitHub Container Registry, deploy.            |
| Hosting         | Render (free plan)                            | Two services: staging (`integration`) and production (`main`).                   |

### Planned, not installed in phase 1

| Area      | Choice                                                             | Phase  |
| --------- | ------------------------------------------------------------------ | ------ |
| Sign-in   | better-auth (email and password, Google)                           | 2      |
| Queue     | Redis with BullMQ (host not chosen)                                | 4      |
| GitHub    | GitHub App for ship-log suggestions                                | 4      |
| LinkedIn  | "Share on LinkedIn" for posting                                    | 4      |
| Email     | Provider not chosen                                                | 2 or 4 |
| Events    | `@nestjs/event-emitter` between modules                            | 3      |
| Real time | Socket.IO                                                          | 5      |
| AI        | pgvector, model provider not chosen, Python service for prediction | 7      |

"Latest" versions are resolved at scaffold and recorded in `docs/PROGRESS.md`. Prisma stays on
major version 7 (the owner's choice; Prisma 8 exists only as a release candidate at the time of
writing and changes the client API). No major upgrade without approval.

## 2. The module-format risk (resolve first, at scaffold)

Prisma 7 ships as an **ES module**: its upgrade guide asks for `"type": "module"` in
`package.json` and `module: "ESNext"` in `tsconfig.json`. A default NestJS project is CommonJS, and
Jest's ES module support needs extra configuration. Before any feature work:

1. Scaffold NestJS, add Prisma 7, and prove one query works in `npm run start:dev`, in a Jest unit
   test, in a Jest end-to-end test, and in the built Docker image.
2. Record the working configuration (`tsconfig`, `package.json` `type`, Jest transform) in this file.
3. If Jest cannot be made reliable with ES modules, **stop and ask the owner** before changing the
   test runner. Jest is the owner's stated choice.

This is the highest technical risk in phase 1.

## 3. Scaffolding commands (run with approval, one at a time)

```bash
npx @nestjs/cli@latest new startupsclub-api --package-manager npm --strict
npm i @nestjs/config @nestjs/swagger @nestjs/throttler helmet class-validator class-transformer
npm i @prisma/client @prisma/adapter-pg pg dotenv
npm i -D prisma @types/pg husky lint-staged eslint-plugin-tsdoc
npm i @sentry/nestjs
npx prisma init
npx husky init
```

## 4. `package.json` scripts (required names; CI and Husky call them)

```json
{
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main.js",
  "build": "nest build",
  "lint": "eslint . --max-warnings=0",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:cov": "jest --coverage",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:deploy": "prisma migrate deploy",
  "db:seed": "prisma db seed",
  "prepare": "husky"
}
```

## 5. TypeScript and ESLint

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `forceConsistentCasingInFileNames`.
- ESLint rules added to the generated config:
  `@typescript-eslint/no-explicit-any: error`,
  the `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return` and
  `no-unsafe-argument` rules as `error` (they reject values that are `any` without writing it),
  `@typescript-eslint/ban-ts-comment` (no `ts-ignore`; `ts-expect-error` only with a description),
  `@typescript-eslint/consistent-type-imports: error`,
  `@typescript-eslint/explicit-function-return-type: error`,
  `@typescript-eslint/no-floating-promises: error`,
  `no-console: error` (use the NestJS `Logger`), `tsdoc/syntax: warn`.
- `--max-warnings=0`. The generated Prisma client and `dist/` are ignored.

## 6. Environment variables (phase 1)

| Name                                                                 | Secret?               | Purpose                                                                                                                                         |
| -------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                           | No                    | `development`, `test` or `production`.                                                                                                          |
| `APP_ENV`                                                            | No                    | `local`, `staging` or `production` (used for Sentry and behaviour switches).                                                                    |
| `PORT`                                                               | No                    | Port to listen on. Local `8000`; code fallback `8080` when unset; Render provides its own. The frontend runs on `3000`.                         |
| `DATABASE_URL`                                                       | **Yes**               | The only database URL, used by the app and by Prisma migrations. On Neon use the **direct** (non-pooler) URL; see `docs/DATABASE.md` section 2. |
| `CORS_ORIGINS`                                                       | No                    | Comma-separated list of allowed frontend origins.                                                                                               |
| `SENTRY_DSN`                                                         | No (public by design) | Empty locally and in tests.                                                                                                                     |
| `APP_VERSION`                                                        | No                    | Commit ID, set by the pipeline; reported by `/health` and Sentry.                                                                               |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | **Yes** (local)       | Read by Docker Compose from `.env` for the local database only.                                                                                 |

Later phases add better-auth, Google, LinkedIn, GitHub, Redis, email and encryption-key variables.
Every variable is listed in `.env.example` with no value.

## 7. Cross-cutting behaviour (global, set in `main.ts` and `AppModule`)

- Global prefix `/api`, URI versioning `v1`.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- A response interceptor wraps successes in `{ data, meta }`; an exception filter produces
  `{ error }` and reports unexpected errors to Sentry.
- `helmet()`, CORS from `CORS_ORIGINS`, `ThrottlerGuard` globally with per-route overrides.
- `app.set("trust proxy", 1)` so client IPs are correct behind Render's proxy (verify the right
  value for Render before relying on it for rate limiting).
- Graceful shutdown hooks enabled, so a restart does not cut requests mid-flight.

## 8. Quality gates

Pull requests into `integration` and `main` must pass: branch policy, format, lint, type check,
Prisma schema validation, unit tests, end-to-end tests against a Postgres service container,
build, and a Docker image build. Details in `docs/DEPLOYMENT.md`.
