import { Resend } from "resend";
import { EmailSendError, EmailSender } from "./email-sender";
import type { OutgoingEmail } from "./email-sender";

/**
 * Sends finished emails (rendered from `src/mail/templates/`) through the Resend API. No Resend
 * dashboard template is used.
 *
 * @packageDocumentation
 */

/** Rate-limit codes that waiting a few seconds will not fix. */
const QUOTA_CODES = new Set(["daily_quota_exceeded", "monthly_quota_exceeded"]);

/**
 * Whether a Resend error can succeed on a later attempt.
 *
 * @param statusCode - HTTP status, or null when the request never got a response.
 * @param code - Resend's error name.
 * @returns True for network failures, rate limits (not quotas) and server errors.
 */
export function isRetryable(statusCode: number | null, code: string): boolean {
  if (statusCode === null) {
    return true;
  }
  if (statusCode === 429) {
    return !QUOTA_CODES.has(code);
  }
  return statusCode >= 500;
}

export class ResendEmailSender extends EmailSender {
  private readonly client: Resend;

  /**
   * @param apiKey - A Resend API key with sending access.
   */
  constructor(apiKey: string) {
    super();
    this.client = new Resend(apiKey);
  }

  /**
   * Sends one email.
   *
   * @param email - The finished email.
   * @throws EmailSendError when Resend rejects the request.
   */
  async send(email: OutgoingEmail): Promise<void> {
    const { error } = await this.client.emails.send(
      {
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      { idempotencyKey: email.idempotencyKey },
    );
    if (error) {
      throw new EmailSendError(error.name, isRetryable(error.statusCode, error.name));
    }
  }
}
