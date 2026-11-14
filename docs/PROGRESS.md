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
