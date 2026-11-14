import { InMemoryEmailSender } from "./in-memory-email.sender";
import { createEmailSender, readMailSettings } from "./mail.config";
import { ResendEmailSender } from "./resend-email.sender";

/**
 * Unit tests for the mail configuration: which sender each environment gets, and that
 * delivering environments refuse to start without their Resend settings.
 *
 * @packageDocumentation
 */

const KEYS = ["APP_ENV", "RESEND_API_KEY", "RESEND_WELCOME_TEMPLATE_ID"] as const;

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
    delete process.env.RESEND_WELCOME_TEMPLATE_ID;

    expect(createEmailSender()).toBeInstanceOf(InMemoryEmailSender);
    expect(readMailSettings().welcomeTemplateId).toBe("waitlist-welcome");
  });

  it("uses Resend and the configured template when APP_ENV is local", () => {
    process.env.APP_ENV = "local";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_WELCOME_TEMPLATE_ID = " template-id ";

    expect(createEmailSender()).toBeInstanceOf(ResendEmailSender);
    expect(readMailSettings().welcomeTemplateId).toBe("template-id");
  });

  it("refuses to start without the Resend settings when delivering", () => {
    process.env.APP_ENV = "production";
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_WELCOME_TEMPLATE_ID;

    expect(() => createEmailSender()).toThrow("RESEND_API_KEY is not set");
    expect(() => readMailSettings()).toThrow("RESEND_WELCOME_TEMPLATE_ID is not set");
  });
});
