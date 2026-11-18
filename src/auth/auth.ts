import { Logger } from "@nestjs/common";
import { betterAuth } from "better-auth";
import type { Auth, BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ALLOWED_ORIGINS } from "../common/allowed-origins";
import { EmailSendError } from "../mail/email-sender";
import type { MailService } from "../mail/mail.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuthSettings } from "./auth.config";

/**
 * The better-auth instance: sign-up with name, email and password (email must be verified
 * before sign-in), sign-in with email and password, and sign-up or sign-in with GitHub. It is
 * built from the app's single `PrismaService` and `MailService` by `AuthModule.forRootAsync` in
 * `app.module.ts`, and serves its routes under `/api/auth/*` (docs/AUTH.md).
 *
 * @packageDocumentation
 */

const logger = new Logger("Auth");

/**
 * Names a send failure without personal data: the provider's code, or the error class.
 *
 * @param error - What the send rejected with.
 * @returns A short, opaque description.
 */
function describe(error: unknown): string {
  if (error instanceof EmailSendError) {
    return error.code;
  }
  return error instanceof Error ? error.name : "UnknownError";
}

/** What the auth instance is built from. */
export interface AuthDependencies {
  prisma: PrismaService;
  mail: MailService;
  settings: AuthSettings;
}

/**
 * The better-auth options. Typed as the general `BetterAuthOptions` so the instance is the plain
 * `Auth` type; there are no plugins or extra fields whose types would be lost.
 *
 * @param deps - The Prisma client, the mail service and the settings.
 * @returns The options.
 */
export function buildAuthOptions({ prisma, mail, settings }: AuthDependencies): BetterAuthOptions {
  return {
    secret: settings.secret,
    baseURL: settings.baseURL,
    trustedOrigins: [...ALLOWED_ORIGINS],
    // Sentry is the only approved telemetry (AGENTS.md rule 9). Keep BETTER_AUTH_TELEMETRY unset.
    telemetry: { enabled: false },
    database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      // An unverified user who tries to sign in gets a fresh link (the sign-in still fails).
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url, token }): Promise<void> => {
        // Not awaited, so the response time does not reveal whether an email was sent;
        // MailService retries and finishes in-flight sends on shutdown.
        void mail
          .sendEmailVerification({
            userId: user.id,
            name: user.name,
            email: user.email,
            url,
            token,
          })
          .catch((error: unknown) => {
            logger.warn(`Verification email failed for user ${user.id} (${describe(error)})`);
          });
      },
    },
    // GitHub tokens in `accounts` are encrypted with the secret (SECURITY.md, AGENTS.md section 10).
    account: { encryptOAuthTokens: true },
    socialProviders: {
      github: {
        clientId: settings.github.clientId,
        clientSecret: settings.github.clientSecret,
      },
    },
  };
}

/**
 * Builds the better-auth instance.
 *
 * @param deps - The Prisma client, the mail service and the settings.
 * @returns The configured auth instance.
 */
export function createAuth(deps: AuthDependencies): Auth {
  return betterAuth(buildAuthOptions(deps));
}
