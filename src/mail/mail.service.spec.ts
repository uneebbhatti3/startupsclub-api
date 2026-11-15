import { EmailSendError } from "./email-sender";
import { InMemoryEmailSender } from "./in-memory-email.sender";
import { MailService, WAITLIST_WELCOME_SUBJECT } from "./mail.service";
import { isRetryable } from "./resend-email.sender";
import { TemplateRenderer } from "./template-renderer";

/**
 * Unit tests for {@link MailService} and the retry rules: what is sent, which failures are
 * retried, and that shutdown waits for sends in progress. Uses the real templates and the
 * in-memory sender with no delays between attempts.
 *
 * @packageDocumentation
 */

const recipient = { entryId: "id-1", name: "Test Founder", email: "founder@example.com" };
const FROM = "Startups Club <hello@example.com>";

/**
 * Builds the service.
 *
 * @param sender - The in-memory sender.
 * @param retries - How many retries to allow.
 * @returns The service under test.
 */
function buildService(sender: InMemoryEmailSender, retries = 3): MailService {
  return new MailService(
    sender,
    new TemplateRenderer(),
    { from: FROM },
    Array.from({ length: retries }, () => 0),
  );
}

describe("MailService", () => {
  it("sends the rendered welcome email with an idempotency key", async () => {
    const sender = new InMemoryEmailSender();

    await buildService(sender).sendWaitlistWelcome(recipient);

    expect(sender.sent).toHaveLength(1);
    const email = sender.sent[0];
    expect(email).toMatchObject({
      from: FROM,
      to: "founder@example.com",
      subject: WAITLIST_WELCOME_SUBJECT,
      idempotencyKey: "waitlist-welcome/id-1",
    });
    expect(email?.html).toContain("Hi Test Founder,");
    expect(email?.text).toContain("Hi Test Founder,");
  });

  it("retries a retryable failure and then succeeds", async () => {
    const sender = new InMemoryEmailSender();
    sender.failNext(new EmailSendError("rate_limit_exceeded", true));
    sender.failNext(new Error("socket hang up"));

    await buildService(sender).sendWaitlistWelcome(recipient);

    expect(sender.sent).toHaveLength(1);
  });

  it("does not retry a permanent failure", async () => {
    const sender = new InMemoryEmailSender();
    const permanent = new EmailSendError("validation_error", false);
    sender.failNext(permanent);

    await expect(buildService(sender).sendWaitlistWelcome(recipient)).rejects.toBe(permanent);
    expect(sender.sent).toHaveLength(0);
  });

  it("gives up after the last retry", async () => {
    const sender = new InMemoryEmailSender();
    for (let i = 0; i < 3; i += 1) {
      sender.failNext(new EmailSendError("internal_server_error", true));
    }

    await expect(buildService(sender, 2).sendWaitlistWelcome(recipient)).rejects.toBeInstanceOf(
      EmailSendError,
    );
    expect(sender.sent).toHaveLength(0);
  });

  it("waits on shutdown for sends still in progress", async () => {
    const sender = new InMemoryEmailSender();
    let release: () => void = () => undefined;
    jest.spyOn(sender, "send").mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const service = buildService(sender);
    const send = service.sendWaitlistWelcome(recipient);

    let shutDown = false;
    const shutdown = service.onApplicationShutdown().then(() => {
      shutDown = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutDown).toBe(false);

    release();
    await send;
    await shutdown;
    expect(shutDown).toBe(true);
  });
});

describe("isRetryable", () => {
  it.each([
    [null, "application_error", true],
    [429, "rate_limit_exceeded", true],
    [429, "daily_quota_exceeded", false],
    [429, "monthly_quota_exceeded", false],
    [500, "internal_server_error", true],
    [422, "validation_error", false],
    [403, "invalid_from_address", false],
    [401, "missing_api_key", false],
  ])("status %s %s → %s", (status, code, expected) => {
    expect(isRetryable(status, code)).toBe(expected);
  });
});
