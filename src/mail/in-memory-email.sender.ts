import { EmailSender } from "./email-sender";
import type { TemplateEmail } from "./email-sender";

/**
 * An email sender that keeps emails in memory: used in tests and CI (`APP_ENV` unset or
 * `test`). Nothing is sent and nothing is written to disk.
 *
 * @packageDocumentation
 */

export class InMemoryEmailSender extends EmailSender {
  /** Emails "sent" so far, oldest first. */
  readonly sent: TemplateEmail[] = [];
  private readonly failures: Error[] = [];

  /**
   * Makes the next send reject with this error instead of recording the email.
   *
   * @param error - The error to reject with.
   */
  failNext(error: Error): void {
    this.failures.push(error);
  }

  /**
   * Records the email, or rejects with a queued failure.
   *
   * @param email - The email.
   */
  send(email: TemplateEmail): Promise<void> {
    const failure = this.failures.shift();
    if (failure) {
      return Promise.reject(failure);
    }
    this.sent.push(email);
    return Promise.resolve();
  }
}
