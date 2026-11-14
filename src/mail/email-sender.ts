/**
 * The contract for sending an email built from a template stored in Resend. `MailService`
 * depends on this abstract class (also the Nest injection token), so tests can swap in
 * `InMemoryEmailSender` without touching the network.
 *
 * @packageDocumentation
 */

/** One email rendered by the provider from a stored template. */
export interface TemplateEmail {
  /** Recipient address. */
  to: string;
  /** Template ID (or alias) in Resend. Its published version supplies sender, subject and body. */
  templateId: string;
  /** Values for the template's variables, keyed exactly as in the template (e.g. `NAME`). */
  variables: Record<string, string>;
  /** Same key, same email: the provider sends it once even if the request is retried. */
  idempotencyKey: string;
}

/**
 * A rejected send. The message carries only the provider's error code, never the provider's
 * text, because that text can contain the recipient's address.
 */
export class EmailSendError extends Error {
  override readonly name = "EmailSendError";

  /**
   * @param code - The provider's error code, such as `validation_error`.
   * @param retryable - Whether trying again later can succeed.
   */
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(`Email provider rejected the send (${code})`);
  }
}

/** Sends one template email; rejects with {@link EmailSendError} when the provider refuses it. */
export abstract class EmailSender {
  abstract send(email: TemplateEmail): Promise<void>;
}
