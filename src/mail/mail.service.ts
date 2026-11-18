import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationShutdown } from "@nestjs/common";
import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { EmailSendError, EmailSender } from "./email-sender";
import type { OutgoingEmail } from "./email-sender";
import { MAIL_RETRY_DELAYS_MS, MAIL_SETTINGS } from "./mail.config";
import type { MailSettings } from "./mail.config";
import { TemplateRenderer } from "./template-renderer";

/**
 * Sends the app's emails: renders a template from `src/mail/templates/`, retries failures that
 * can pass on a later attempt, and on shutdown waits for sends still in progress so a restart
 * does not drop them.
 *
 * @packageDocumentation
 */

/** Subject of the waitlist welcome email. */
export const WAITLIST_WELCOME_SUBJECT = "You're on the StartupsClub waitlist 🚀";

/** Who the waitlist welcome email goes to. */
export interface WaitlistWelcomeRecipient {
  /** The waitlist entry id; makes the send idempotent. */
  entryId: string;
  name: string;
  email: string;
}

/** Subject of the email verification email. */
export const EMAIL_VERIFICATION_SUBJECT = "Verify your email for StartupsClub";

/** Who the email verification email goes to. */
export interface EmailVerificationRecipient {
  /** The user id; with the token, makes the send idempotent. */
  userId: string;
  name: string;
  email: string;
  /** The better-auth verification link (carries the token). */
  url: string;
  /** The verification token in `url`. */
  token: string;
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

/**
 * Hashes a token for use in an idempotency key.
 *
 * @param token - The verification token.
 * @returns Its SHA-256 hex digest.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly sender: EmailSender,
    private readonly templates: TemplateRenderer,
    @Inject(MAIL_SETTINGS) private readonly settings: MailSettings,
    @Inject(MAIL_RETRY_DELAYS_MS) private readonly retryDelaysMs: readonly number[],
  ) {}

  /**
   * Sends the waitlist welcome email (`templates/waitlist-welcome.html` and `.txt`).
   *
   * @param recipient - The new waitlist entry.
   * @returns Resolves once Resend accepts the email; rejects after the last failed attempt.
   */
  sendWaitlistWelcome(recipient: WaitlistWelcomeRecipient): Promise<void> {
    return this.track(this.sendWaitlistWelcomeNow(recipient));
  }

  /**
   * Sends the email verification link (`templates/email-verification.html` and `.txt`).
   *
   * @param recipient - The user and the better-auth verification URL.
   * @returns Resolves once Resend accepts the email; rejects after the last failed attempt.
   */
  sendEmailVerification(recipient: EmailVerificationRecipient): Promise<void> {
    return this.track(this.sendEmailVerificationNow(recipient));
  }

  /** Waits for sends still in progress (successful or not) before the process exits. */
  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.pending);
  }

  /**
   * Renders and sends the welcome email.
   *
   * @param recipient - The new waitlist entry.
   */
  private async sendWaitlistWelcomeNow(recipient: WaitlistWelcomeRecipient): Promise<void> {
    const { html, text } = await this.templates.render("waitlist-welcome", {
      name: recipient.name,
    });
    await this.sendWithRetry({
      from: this.settings.from,
      to: recipient.email,
      subject: WAITLIST_WELCOME_SUBJECT,
      html,
      text,
      idempotencyKey: `waitlist-welcome/${recipient.entryId}`,
    });
  }

  /**
   * Renders and sends the verification email. The idempotency key uses the token, so a resend
   * (a new token) is a new email while a retry of the same send is not.
   *
   * @param recipient - The user and the verification URL.
   */
  private async sendEmailVerificationNow(recipient: EmailVerificationRecipient): Promise<void> {
    const { html, text } = await this.templates.render("email-verification", {
      name: recipient.name,
      url: recipient.url,
    });
    await this.sendWithRetry({
      from: this.settings.from,
      to: recipient.email,
      subject: EMAIL_VERIFICATION_SUBJECT,
      html,
      text,
      // The token is a long JWT; its hash keeps the key short (Resend allows 256 chars) and opaque.
      idempotencyKey: `email-verification/${recipient.userId}/${hashToken(recipient.token)}`,
    });
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
  private async sendWithRetry(email: OutgoingEmail): Promise<void> {
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
