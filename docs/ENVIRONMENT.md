# Environments and configuration

## 1. Environments

| Environment | Branch          | Host                  | Database                    | Purpose                |
| ----------- | --------------- | --------------------- | --------------------------- | ---------------------- |
| Local       | any `feature/*` | Your machine          | Docker `postgres:18-alpine` | Development            |
| Test / CI   | any             | GitHub runner         | Throwaway Postgres          | Automated checks       |
| Staging     | `integration`   | Render service (free) | Neon (staging)              | Preview and acceptance |
| Production  | `main`          | Render service (free) | Neon (production)           | Real users             |

## 2. Rules

1. Configuration comes only from environment variables. The full list is `.env.example` (names,
   no values) and `docs/TRD.md` section 6.
2. `.env` is git-ignored and never read by agents. `.env.example` is committed with empty values.
3. Secrets live only in GitHub (Actions secrets) and Render (environment variables). Never in
   code, images, logs or the repository (this repository is public).
4. The app validates configuration at startup and exits with a clear message if something is
   missing or malformed.
5. Staging and production use different databases, different secrets and different Sentry
   environments. A staging secret must never work in production.

## 3. Local setup

```bash
cp .env.example .env        # fill in values yourself; agents must not read this file
docker compose up -d        # PostgreSQL (and a test database)
npm ci
npm run db:generate
npm run db:migrate
npm run start:dev
```

Docker Compose reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and `POSTGRES_PORT` from
`.env`. `DATABASE_URL` must use the same values.

## 4. GitHub secrets and variables (set by the owner)

Create two GitHub **Environments**, `staging` and `production` (repository Settings, then
Environments). Each holds the same names with its own values, so the workflow picks the right set
from the branch (`integration` uses `staging`, `main` uses `production`).

| Name                 | Kind     | Where                   | Used for                                                        |
| -------------------- | -------- | ----------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`       | Secret   | each environment        | Neon database for `prisma migrate deploy`                       |
| `RENDER_DEPLOY_HOOK` | Secret   | each environment        | Triggers that environment's Render deploy                       |
| `HEALTH_URL`         | Variable | each environment        | Post-deploy check, e.g. `https://<service>.onrender.com/health` |
| `SENTRY_AUTH_TOKEN`  | Secret   | repository (TO CONFIRM) | Source maps and releases                                        |

The image is pushed with the built-in `GITHUB_TOKEN`; no personal token is stored for publishing.

## 5. Render variables (set by the owner, per service)

All runtime variables from `docs/TRD.md` section 6 except the `POSTGRES_*` ones. `DATABASE_URL` is
the same Neon value as that environment's GitHub secret. `APP_ENV` is
`staging` or `production`.

## 6. Husky

`npm install` runs `husky` through the `prepare` script. Hooks live in `.husky/` (same as the
frontend repository):

- `pre-commit`: blocks commits on `main`, `integration` or a branch that is not
  `feature/<feature_name>`; then runs lint-staged: Prettier **writes** the formatting into the staged
  files (and they are re-staged), then ESLint with zero warnings. An explicit `any` or any unsafe use
  of an `any` value fails the commit.
- `pre-push`: `npm run typecheck`.

Unit and end-to-end tests are not in a hook; CI runs them. If hooks do not run, run `npx husky`
once, and make sure the files are executable (`chmod +x .husky/*`).
