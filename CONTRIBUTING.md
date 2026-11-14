# Contributing

## Workflow

1. Update `integration`, then branch: `git switch -c feature/<feature_name> integration`
   (lowercase letters, digits and hyphens only).
2. Make small commits. On commit, Husky blocks branches that are not `feature/<name>`, formats the
   staged files with Prettier and lints them with ESLint (the type `any` fails the commit). On push it runs
   the type check. Never use `--no-verify`.
3. Open a pull request into **`integration`**. Describe what changed, how it was tested and any
   migration. CI must pass.
4. After review and merge, staging deploys automatically.
5. The owner opens a pull request from **`integration`** into **`main`**. After merge, production
   deploys automatically.

You cannot push to `main` or `integration`, and a feature branch cannot target `main`.

## Pull request checklist

- [ ] Tests added or updated; all checks pass locally
- [ ] No `any`, no disabled lint rules, TSDoc after imports
- [ ] DTOs validated and documented in OpenAPI
- [ ] Migration is backward compatible, SQL reviewed
- [ ] No secrets or personal data
- [ ] `docs/PROGRESS.md` (and `docs/DECISIONS.md`) updated

## Commit messages

Short imperative subject (`Add waitlist endpoint`), optional body explaining why.

## AI agents

Read `AGENTS.md` first. Agents stop and ask whenever something is unclear.
