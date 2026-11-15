# Waitlist (phase 1)

Public signup for the StartupsClub waitlist. Table: `waitlist_entries` (`docs/DATABASE.md`
section 6).

## 1. Endpoint

`POST /api/v1/waitlist`, public, rate limited to **5 requests a minute per client IP**.

### Request body

| Field       | Type                                  | Rules                                                                               |
| ----------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| `name`      | string                                | Trimmed; 1 to 100 characters.                                                       |
| `email`     | string                                | Trimmed and lowercased, then a valid email of at most 254 characters.               |
| `role`      | `"founder"`, `"developer"`, `"other"` | Lowercase only.                                                                     |
| `roleOther` | string, optional                      | Trimmed; 1 to 50 characters. Required when `role` is `"other"`, rejected otherwise. |

Unknown fields are rejected.

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "role": "other", "roleOther": "Designer" }
```

### Responses

| Status | Body                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 201    | `{ "data": { "id", "name", "email", "role", "roleOther", "createdAt" } }` (role lowercase, `roleOther` null unless other)    |
| 400    | `{ "error": { "code": "VALIDATION_FAILED", "message": "Request validation failed", "details": [{ "field", "messages" }] } }` |
| 409    | `{ "error": { "code": "WAITLIST_EMAIL_EXISTS", "message": "Already in the waitlist", "details": [] } }`                      |
| 429    | `{ "error": { "code": "TOO_MANY_REQUESTS", ... } }`                                                                          |

The 409 message is written to be shown to the user as is. The duplicate check is case-insensitive
because emails are stored lowercased.

### Count

`GET /api/v1/waitlist/count`, public, global rate limit (100 requests a minute per client IP).
Counts every row in `waitlist_entries`; returns only the total, never any entry.

| Status | Body                                                |
| ------ | --------------------------------------------------- |
| 200    | `{ "data": { "count": 123 } }`                      |
| 429    | `{ "error": { "code": "TOO_MANY_REQUESTS", ... } }` |

## 2. Code layout (`src/waitlist/`)

| File                                 | Responsibility                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `waitlist.controller.ts`             | Route, rate limit, OpenAPI decorators; calls the service.                                                                         |
| `waitlist.service.ts`                | Role mapping, 409 on duplicates, mapping rows to the response DTO, starting the welcome email.                                    |
| `waitlist.repository.ts`             | Database access only. `create()` returns `null` on a duplicate email (Prisma `P2002`), so the check is a single race-safe insert. |
| `dto/create-waitlist-entry.dto.ts`   | Request validation and normalisation.                                                                                             |
| `dto/waitlist-entry-response.dto.ts` | Response shape.                                                                                                                   |
| `dto/waitlist-count-response.dto.ts` | Response shape of the count.                                                                                                      |

## 3. Welcome email

After a successful signup (never on a 409), the service starts the welcome email through
`MailService` (`src/mail/`) and returns the 201 without waiting for it.

- **Template (owner's decision):** `src/mail/templates/waitlist-welcome.html` and `.txt`, written
  in the repo with the same layout, styles and copy as the owner's Resend design, rendered by
  `src/mail/template-renderer.ts` and copied to `dist/` by `nest-cli.json` `assets`. No Resend
  dashboard template is used or fetched. `{{name}}` is HTML-escaped in the HTML part; a
  placeholder without a value fails the send instead of going out as raw braces.
- **Sent through Resend** with the `resend` package: sender `MAIL_FROM` (a bare address gets the
  display name "Startups Club"), subject `WAITLIST_WELCOME_SUBJECT` in `src/mail/mail.service.ts`
  ("You're on the StartupsClub waitlist 🚀"), HTML and plain text.
- **Environments (`src/mail/mail.config.ts`):** Resend when `APP_ENV` is `local`, `staging` or
  `production`; the app refuses to start if `RESEND_API_KEY` or `MAIL_FROM` is missing. Elsewhere an in-memory sender is used, and the Jest e2e setup forces `APP_ENV=test`,
  so tests never send email. Sent emails are never stored on disk.
- **Failures:** up to 3 retries (after 1s, 2s and 4s) for network errors, rate limits and Resend
  server errors, with an idempotency key per entry so a retry never sends twice. Other errors
  (invalid key, validation, quota) are not retried. A final failure is logged with the entry id
  and Resend's error code only, and the signup stays saved.
- **Shutdown:** `enableShutdownHooks()` and `MailService.onApplicationShutdown` let sends in
  progress finish before the process exits.
- **Why not a queue:** RabbitMQ needs a broker that the Render free plan cannot host, and BullMQ
  is planned for phase 4. For a welcome email, losing one in flight during a crash is acceptable.
  If emails must survive crashes later, use `@nestjs/outbox` (Postgres, same transaction).
- **Tests:** `InMemoryEmailSender` replaces the Resend sender in e2e tests.

## 4. Decisions (owner, 2026-11-14)

- Controller → service → **repository** layering for feature modules. This replaces "only services
  touch the database" in `AGENTS.md` section 5: repositories hold the queries, services call them.
- Duplicates return **409** with "Already in the waitlist". This replaces the earlier "never reveal
  whether an email was registered" rule; it does let anyone check whether an email is registered.
- Only `POST` for now; listing or exporting signups waits for authentication (phase 2).

## 5. Decisions (owner, 2026-11-15)

- `GET /api/v1/waitlist/count` is **public** (it exposes only a number), counts **all rows**, and
  uses the **global** rate limit. Listing or exporting entries still waits for phase 2.
