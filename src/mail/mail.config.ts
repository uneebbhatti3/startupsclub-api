import type { EmailSender } from "./email-sender";
import { InMemoryEmailSender } from "./in-memory-email.sender";
import { ResendEmailSender } from "./resend-email.sender";

/**
 * Mail configuration from environment variables. Local, staging and production send real email
 * through Resend and refuse to start without `RESEND_API_KEY` and `RESEND_WELCOME_TEMPLATE_ID`.
 * Tests and CI (`APP_ENV` unset or `test`) keep emails in memory: nothing is sent or stored.
 *
 * @packageDocumentation
 */

/** Environments that deliver real email. */
const DELIVERING_ENVIRONMENTS = new Set(["local", "staging", "production"]);

/** Template ID used where nothing is delivered, so tests need no Resend settings. */
const NON_DELIVERING_TEMPLATE_ID = "waitlist-welcome";

/** Injection token for {@link MailSettings}. */
export const MAIL_SETTINGS = Symbol("MAIL_SETTINGS");

/** Injection token for the waits between send attempts, in milliseconds. */
export const MAIL_RETRY_DELAYS_MS = Symbol("MAIL_RETRY_DELAYS_MS");

/** Three retries after the first attempt: 1s, 2s, then 4s later. */
export const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [1_000, 2_000, 4_000];

/** Which Resend templates the app sends. */
export interface MailSettings {
  /** ID of the published waitlist welcome template; it uses the `NAME` variable. */
  welcomeTemplateId: string;
}

/**
 * Reads a required variable.
 *
 * @param name - The variable name.
 * @returns Its value, trimmed.
 * @throws Error naming the variable when it is missing or empty.
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. See .env.example and docs/WAITLIST.md.`);
  }
  return value;
}

/**
 * Whether this environment sends real email.
 *
 * @returns True for local, staging and production.
 */
export function deliversMail(): boolean {
  return DELIVERING_ENVIRONMENTS.has(process.env.APP_ENV ?? "");
}

/**
 * Builds the sender for the current environment.
 *
 * @returns Resend in local, staging and production; in memory elsewhere.
 */
export function createEmailSender(): EmailSender {
  return deliversMail()
    ? new ResendEmailSender(required("RESEND_API_KEY"))
    : new InMemoryEmailSender();
}

/**
 * Reads the template IDs.
 *
 * @returns The mail settings.
 */
export function readMailSettings(): MailSettings {
  return {
    welcomeTemplateId: deliversMail()
      ? required("RESEND_WELCOME_TEMPLATE_ID")
      : process.env.RESEND_WELCOME_TEMPLATE_ID?.trim() || NON_DELIVERING_TEMPLATE_ID,
  };
}
