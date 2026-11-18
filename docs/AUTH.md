# Authentication

Sign-up and sign-in with **email and password** or **GitHub**, built on
[better-auth](https://better-auth.com) 1.7 and `@thallesp/nestjs-better-auth` 2.8 (the NestJS
integration from the [better-auth NestJS guide](https://better-auth.com/docs/integrations/nestjs)).
Tables: `users`, `sessions`, `accounts`, `verifications` (migration
`20261117164155_add_auth_tables`).

## 1. Endpoints

better-auth serves its own routes under **`/api/auth/*`**. They are not NestJS controllers, so they
do **not** use the `{ data, meta }` / `{ error: { code, message, details } }` shapes from
`docs/API_CONVENTIONS.md`: success bodies are better-auth's, and errors are
`{ "code": "...", "message": "..." }`. The session travels in the `better-auth.session_token`
cookie (HttpOnly), so the frontend must send requests with `credentials: "include"`.

| Method | Path                                | Body                                                                          | Result                                                                                                                                       |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/sign-up/email`           | `{ name, email, password, callbackURL? }`                                     | 200 `{ token: null, user }`. No session yet; a verification email is sent.                                                                   |
| POST   | `/api/auth/sign-in/email`           | `{ email, password, callbackURL?, rememberMe? }`                              | 200 `{ token, user }` and the session cookie. 403 `EMAIL_NOT_VERIFIED` (and a fresh link) if not verified; 401 on a wrong email or password. |
| GET    | `/api/auth/verify-email`            | query `token`, `callbackURL` (from the link)                                  | Marks the email verified, signs the user in (cookie) and redirects 302 to `callbackURL`.                                                     |
| POST   | `/api/auth/send-verification-email` | `{ email, callbackURL? }`                                                     | Sends a new verification link.                                                                                                               |
| POST   | `/api/auth/sign-in/social`          | `{ provider: "github", callbackURL, errorCallbackURL?, newUserCallbackURL? }` | 200 `{ url, redirect: true }`: the frontend sends the browser to `url` (GitHub).                                                             |
| GET    | `/api/auth/callback/github`         | (GitHub calls it)                                                             | Creates or signs in the user and redirects to `callbackURL` with the session cookie.                                                         |
| GET    | `/api/auth/get-session`             | (cookie)                                                                      | 200 `{ session, user }`, or `null` when signed out.                                                                                          |
| POST   | `/api/auth/sign-out`                | (cookie)                                                                      | Ends the session.                                                                                                                            |

Every `callbackURL` must be on a trusted origin (section 3), otherwise better-auth answers 403.
GitHub sign-up and sign-in are the same call: the first GitHub sign-in creates the user. GitHub
only returns verified emails, so those users are verified from the start.

## 2. Rules

| Rule                  | Value                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Password length       | 8 to 128 characters (better-auth defaults). Stored hashed (scrypt) in `accounts.password`. |
| Email verification    | Required before email sign-in. Sent on sign-up and again on an unverified sign-in.         |
| Verification link     | Valid for 1 hour. Opening it verifies the email and signs the user in.                     |
| After verification    | Redirect to the `callbackURL` the frontend sent at sign-up.                                |
| GitHub tokens         | Stored encrypted (`account.encryptOAuthTokens`, keyed by `BETTER_AUTH_SECRET`).            |
| better-auth telemetry | Off (`telemetry.enabled: false`); `BETTER_AUTH_TELEMETRY` must stay unset.                 |

The verification email is `src/mail/templates/email-verification.html` and `.txt`, sent through
`MailService.sendEmailVerification` (Resend, retries, idempotency key with a hash of the token). It
is not awaited; a failed send is logged with the user id and error code only.

## 3. Route protection

`AuthModule` registers a **global `AuthGuard`**: every NestJS route needs a valid session unless it
is marked `@AllowAnonymous()` (public) or `@OptionalAuth()`. `AppController`, `HealthController`
and `WaitlistController` are marked `@AllowAnonymous()`. In a protected handler, read the user with
`@Session() session: UserSession` from `@thallesp/nestjs-better-auth`.

Trusted origins come from `src/common/allowed-origins.ts`, the same list `main.ts` uses for CORS:
`http://localhost:3000` and `https://www.startupsclub.one`.

## 4. Code layout

| File                            | Responsibility                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `src/auth/auth.ts`              | `buildAuthOptions()` and `createAuth()`: the better-auth configuration.             |
| `src/auth/auth.config.ts`       | `readAuthSettings()`: env variables, placeholders in tests.                         |
| `src/app.module.ts`             | `AuthModule.forRootAsync`, built from the single `PrismaService` and `MailService`. |
| `src/main.ts`                   | `bodyParser: false` (the module re-adds JSON and form parsing for other routes).    |
| `src/common/allowed-origins.ts` | Frontend origins for CORS and `trustedOrigins`.                                     |

## 5. Environment variables

| Name                   | Secret? | Purpose                                                                                                                                                                        |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | **Yes** | Signs cookies and tokens, encrypts GitHub tokens. 32+ random characters (`openssl rand -base64 32`). Changing it signs everyone out and makes stored GitHub tokens unreadable. |
| `BETTER_AUTH_URL`      | No      | Public URL of this API, e.g. `http://localhost:8000`. Verification links and the GitHub callback point here.                                                                   |
| `GITHUB_CLIENT_ID`     | No      | GitHub OAuth app client id.                                                                                                                                                    |
| `GITHUB_CLIENT_SECRET` | **Yes** | GitHub OAuth app client secret.                                                                                                                                                |

All four are required when `APP_ENV` is `local`, `staging` or `production`; the app refuses to
start without them. Tests and CI use fixed placeholders and never call GitHub.

**GitHub OAuth app:** GitHub → Settings → Developer settings → OAuth Apps. Callback URL:
`<BETTER_AUTH_URL>/api/auth/callback/github` (one app per environment, since GitHub allows one
callback URL per OAuth app). Enable "email" access; better-auth requests the `user:email` scope.

## 6. Open

- **Cross-site cookies in staging and production.** If the API is not on a subdomain of
  `startupsclub.one`, browsers treat the session cookie as third-party. The cookie attributes
  (`SameSite=None; Secure`, or `crossSubDomainCookies` with an `api.startupsclub.one` domain) are
  not set yet and depend on the API's final domain. TO CONFIRM before the first staging deploy.
- Password reset, account linking rules and session lifetime use better-auth defaults and are not
  exposed in the UI plan yet.
