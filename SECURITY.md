# Security

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting on this repository
(Security tab, "Report a vulnerability"). _The owner must enable it; a contact address is a
placeholder until the owner decides._ We aim to acknowledge reports within a few days.

## Rules for contributors and agents

1. This repository is public: never commit secrets, tokens, real emails, real data or private
   URLs. If one is committed, treat it as leaked: rotate it first, then remove it.
2. Never read or edit `.env*` files (only `.env.example`).
3. Validate every input on the server; reject unknown fields; set maximum lengths.
4. Rate limit public endpoints; keep CORS limited to configured origins; keep Helmet on.
5. Never return stack traces, SQL or internal messages to clients.
6. Store third-party tokens encrypted; never log them; strip them from Sentry events.
7. Verify webhook signatures on the raw body; compare secrets in constant time.
8. Responses must not reveal whether an account or waitlist email exists.
9. Use parameterised queries only (Prisma). No string-built SQL; no `$queryRawUnsafe`.
10. Dependencies: add only with approval; keep them updated (Dependabot, TO CONFIRM); run
    `npm audit` in CI and review findings.
11. CI secrets are available only to branches merged into protected branches, never to forks.
12. Docker images contain no secrets and run as a non-root user.

## Personal data

Collected data is minimised. The waitlist stores an email, an optional name and a source tag.
People can ask for deletion; the owner handles requests by deleting the row.

## Supported versions

Only the current `main` is supported.
