import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationShutdown } from "@nestjs/common";
import { setTimeout as sleep } from "node:timers/promises";
import { EmailSendError, EmailSender } from "./email-sender";
import type { TemplateEmail } from "./email-sender";
import { MAIL_RETRY_DELAYS_MS, MAIL_SETTINGS } from "./mail.config";
import type { MailSettings } from "./mail.config";

/**
 * Sends the app's emails from Resend templates: retries failures that can pass on a later
 * attempt, and on shutdown waits for sends still in progress so a restart does not drop them.
 *
 * @packageDocumentation
 */

/** Who the waitlist welcome email goes to. */
export interface WaitlistWelcomeRecipient {
  /** The waitlist entry id; makes the send idempotent. */
  entryId: string;
  name: string;
  email: string;
}

/**
 * Neutralises markup in a template variable. Resend does not document whether it escapes
 * variable values, so `<` and `>` are encoded here: a name cannot add tags or links to the email.
 *
 * @param value - The raw value.
 * @returns The value with angle brackets encoded.
 */
export function escapeMarkup(value: string): string {
  return value.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Whether an error is worth another attempt.
 *
 * @param error - What the sender threw.
 * @returns The provider's verdict, or true for unexpected errors (such as a network failure).
 */
function isRetryableError(error: unknown): boolean {
  return error instanceof EmailSendError ? error.retryable : true;
}

@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly sender: EmailSender,
    @Inject(MAIL_SETTINGS) private readonly settings: MailSettings,
    @Inject(MAIL_RETRY_DELAYS_MS) private readonly retryDelaysMs: readonly number[],
  ) {}

  /**
   * Sends the waitlist welcome email from the Resend template.
   *
   * @param recipient - The new waitlist entry.
   * @returns Resolves once Resend accepts the email; rejects after the last failed attempt.
   */
  sendWaitlistWelcome(recipient: WaitlistWelcomeRecipient): Promise<void> {
    return this.track(
      this.sendWithRetry({
        to: recipient.email,
        templateId: this.settings.welcomeTemplateId,
        variables: { NAME: escapeMarkup(recipient.name) },
        idempotencyKey: `waitlist-welcome/${recipient.entryId}`,
      }),
    );
  }

  /** Waits for sends still in progress (successful or not) before the process exits. */
  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.pending);
  }

  /**
   * Remembers a send until it settles, for {@link MailService.onApplicationShutdown}.
   *
   * @param send - The send in progress.
   * @returns The same promise.
   */
  private track(send: Promise<void>): Promise<void> {
    this.pending.add(send);
    const forget = (): void => {
      this.pending.delete(send);
    };
    void send.then(forget, forget);
    return send;
  }

  /**
   * Sends, retrying retryable failures after each configured delay.
   *
   * @param email - The email.
   */
  private async sendWithRetry(email: TemplateEmail): Promise<void> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await this.sender.send(email);
        return;
      } catch (error: unknown) {
        const delay = this.retryDelaysMs[attempt];
        if (delay === undefined || !isRetryableError(error)) {
          throw error;
        }
        await sleep(delay);
      }
    }
  }
}
