import type { EmailSender } from "./email-sender";
import { InMemoryEmailSender } from "./in-memory-email.sender";
import { ResendEmailSender } from "./resend-email.sender";

/**
 * Mail configuration from environment variables. Local, staging and production send real email
 * through Resend and refuse to start without `RESEND_API_KEY` and `MAIL_FROM`. Tests and CI
 * (`APP_ENV` unset or `test`) keep emails in memory: nothing is sent or stored.
 *
 * @packageDocumentation
 */

/** Environments that deliver real email. */
const DELIVERING_ENVIRONMENTS = new Set(["local", "staging", "production"]);

/** Display name inboxes show for the sender when `MAIL_FROM` is a bare address. */
export const SENDER_NAME = "Startups Club";

/** Sender used where nothing is delivered. `example.com` is reserved and never routes. */
const NON_DELIVERING_FROM = "waitlist@example.com";

/** Injection token for {@link MailSettings}. */
export const MAIL_SETTINGS = Symbol("MAIL_SETTINGS");

/** Injection token for the waits between send attempts, in milliseconds. */
export const MAIL_RETRY_DELAYS_MS = Symbol("MAIL_RETRY_DELAYS_MS");

/** Three retries after the first attempt: 1s, 2s, then 4s later. */
export const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [1_000, 2_000, 4_000];

/** Settings shared by every email. */
export interface MailSettings {
  /** Sender with display name, e.g. `Startups Club <hello@startupsclub.one>`. */
  from: string;
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
 * Turns `MAIL_FROM` into the sender. A bare address gets the {@link SENDER_NAME} display name,
 * so inboxes show the company rather than the mailbox ("hello"); `Name <address>` is kept.
 *
 * @param value - The `MAIL_FROM` value.
 * @returns The sender.
 */
export function toSender(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("<") ? trimmed : `${SENDER_NAME} <${trimmed}>`;
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
 * Reads the settings shared by every email.
 *
 * @returns The mail settings.
 */
export function readMailSettings(): MailSettings {
  const from = deliversMail()
    ? required("MAIL_FROM")
    : process.env.MAIL_FROM?.trim() || NON_DELIVERING_FROM;
  return { from: toSender(from) };
}
