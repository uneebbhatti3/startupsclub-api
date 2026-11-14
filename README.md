# StartupsClub API

The backend of [StartupsClub](https://github.com/), an accountability and community platform for
startup founders and developers. A final year project by Uneeb Bhatti, Hadia Abid and
M. Ahtisham Shahid.

**Status:** phase 1, foundation and waitlist API (documentation stage).

## Stack

NestJS, TypeScript, PostgreSQL, Prisma 7, better-auth, Sentry, Jest, Docker, GitHub Actions,
Render and Neon. Details: [`docs/TRD.md`](docs/TRD.md).

## Quick start

```bash
cp .env.example .env     # then fill in your own values
docker compose up -d     # local PostgreSQL
npm ci
npm run db:generate
npm run db:migrate
npm run start:dev
```

The API listens on `PORT` (8000 locally, fallback 8080 when unset); the frontend runs on 3000. Interactive docs at `/api/docs` (non-production).

## Scripts

`npm run lint`, `format:check`, `typecheck`, `test`, `test:e2e`, `build`. Full list in the TRD.

## Branches and deployment

`feature/<name>` → pull request → `integration` (staging) → pull request → `main` (production).
Deployment happens only after a merge. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Documentation

Start with [`AGENTS.md`](AGENTS.md) (rules for people and AI agents) and the map inside it.

## Security

See [`SECURITY.md`](SECURITY.md). Do not open public issues for vulnerabilities.
