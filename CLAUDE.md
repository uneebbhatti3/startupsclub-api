# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- **Ask, do not guess.** Use `AskUserQuestion` for every ambiguity, however small. Group related
  questions in one call. Do not continue past an unanswered question.
- **Never read `.env*`** (only `.env.example`). The deny rules in `.claude/settings.json` back this
  up; do not work around them with `cat`, `grep`, `type`, scripts or tools.
- **Plan first.** For any new module, endpoint, migration or refactor, state the plan (files to
  touch, documents that apply, tests to add) and get approval before editing.
- **Library versions matter here.** Prisma 7, better-auth and Sentry have version-specific setup.
  Before using an API you are not certain about, read the documentation that ships in
  `node_modules` or the official docs, and say what you checked. Do not rely on memory.
- **Migrations are one-way.** Show the generated SQL and wait for approval before applying a
  migration. Never run a destructive database command.
- **Run the database locally with Docker** (`docker compose up -d`). Never point local commands at
  the staging or production database.
- **Keep context small.** Read the documents for the task, not all of `docs/`.
- **Finish properly.** Run the checks in `AGENTS.md` section 8, update `docs/PROGRESS.md`, and
  report what changed and what you could not verify.
- **Git.** Never commit or push unless asked. Commit only on a `feature/<feature_name>` branch.
  Never use `--no-verify`.
- **Commit message attribution** follows the harness's instructions; add none of your own.
