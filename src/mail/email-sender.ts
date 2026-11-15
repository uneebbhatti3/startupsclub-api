/**
 * The contract for sending one finished email (HTML and plain text). `MailService` depends on
 * this abstract class (also the Nest injection token), so tests can swap in
 * `InMemoryEmailSender` without touching the network.
 *
 * @packageDocumentation
 */

/** One email, ready to send. */
export interface OutgoingEmail {
  /** Sender, e.g. `Startups Club <hello@startupsclub.one>`. */
  from: string;
  /** Recipient address. */
  to: string;
  subject: string;
  html: string;
  text: string;
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

/** Sends one email; rejects with {@link EmailSendError} when the provider refuses it. */
export abstract class EmailSender {
  abstract send(email: OutgoingEmail): Promise<void>;
}
