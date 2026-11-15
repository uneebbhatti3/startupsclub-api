import { InMemoryEmailSender } from "./in-memory-email.sender";
import { createEmailSender, readMailSettings, toSender } from "./mail.config";
import { ResendEmailSender } from "./resend-email.sender";

/**
 * Unit tests for the mail configuration: which sender each environment gets, the sender's
 * display name, and that delivering environments refuse to start without their settings.
 *
 * @packageDocumentation
 */

const KEYS = ["APP_ENV", "RESEND_API_KEY", "MAIL_FROM"] as const;

describe("mail config", () => {
  const saved = new Map(KEYS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("keeps email in memory when APP_ENV is test", () => {
    process.env.APP_ENV = "test";
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;

    expect(createEmailSender()).toBeInstanceOf(InMemoryEmailSender);
    expect(readMailSettings().from).toBe("Startups Club <waitlist@example.com>");
  });

  it("uses Resend and MAIL_FROM when APP_ENV is local", () => {
    process.env.APP_ENV = "local";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.MAIL_FROM = " hello@example.com ";

    expect(createEmailSender()).toBeInstanceOf(ResendEmailSender);
    expect(readMailSettings().from).toBe("Startups Club <hello@example.com>");
  });

  it("refuses to start without the Resend settings when delivering", () => {
    process.env.APP_ENV = "production";
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;

    expect(() => createEmailSender()).toThrow("RESEND_API_KEY is not set");
    expect(() => readMailSettings()).toThrow("MAIL_FROM is not set");
  });
});

describe("toSender", () => {
  it("adds the company name to a bare address", () => {
    expect(toSender("hello@example.com")).toBe("Startups Club <hello@example.com>");
  });

  it("keeps a display name that is already set", () => {
    expect(toSender("Example Team <hello@example.com>")).toBe("Example Team <hello@example.com>");
  });
});
