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

## 2. Code layout (`src/waitlist/`)

| File                                 | Responsibility                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `waitlist.controller.ts`             | Route, rate limit, OpenAPI decorators; calls the service.                                                                         |
| `waitlist.service.ts`                | Role mapping, 409 on duplicates, mapping rows to the response DTO, starting the welcome email.                                    |
| `waitlist.repository.ts`             | Database access only. `create()` returns `null` on a duplicate email (Prisma `P2002`), so the check is a single race-safe insert. |
| `dto/create-waitlist-entry.dto.ts`   | Request validation and normalisation.                                                                                             |
| `dto/waitlist-entry-response.dto.ts` | Response shape.                                                                                                                   |

## 3. Welcome email

After a successful signup (never on a 409), the service starts the welcome email through
`MailService` (`src/mail/`) and returns the 201 without waiting for it.

- **Template (owner's decision):** the email is the owner's **published Resend template**, sent by
  ID (`RESEND_WELCOME_TEMPLATE_ID`) with the `resend` package. The template supplies the sender,
  subject and body; the API sends only the recipient and the `NAME` variable. Editing and
  publishing the template in Resend changes the email with no deploy. No copy of the template is
  kept in this repository. If the template gains a variable, the API must send it too, or Resend
  rejects the email.
- **Name safety:** Resend does not document whether variable values are escaped, so `<` and `>`
  in the name are encoded before sending.
- **Environments (`src/mail/mail.config.ts`):** Resend when `APP_ENV` is `local`, `staging` or
  `production`; the app refuses to start if `RESEND_API_KEY` or `RESEND_WELCOME_TEMPLATE_ID` is
  missing. Elsewhere an in-memory sender is used, and the Jest e2e setup forces `APP_ENV=test`,
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
