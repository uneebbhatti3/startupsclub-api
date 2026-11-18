import { Logger } from "@nestjs/common";
import type { User } from "better-auth";
import { ALLOWED_ORIGINS } from "../common/allowed-origins";
import { EmailSendError } from "../mail/email-sender";
import type { MailService } from "../mail/mail.service";
import type { PrismaService } from "../prisma/prisma.service";
import { buildAuthOptions } from "./auth";
import type { AuthSettings } from "./auth.config";

/**
 * Unit tests for the better-auth options: which sign-in methods are on, that email must be
 * verified, that only the shared frontend origins are trusted, and that the verification email
 * goes through `MailService` without personal data in logs. Nothing touches a database or GitHub.
 *
 * @packageDocumentation
 */

const settings: AuthSettings = {
  secret: "fake-secret-for-unit-test-only-0123456789",
  baseURL: "http://localhost:8080",
  github: { clientId: "fake-id", clientSecret: "fake-secret" },
};

const user: User = {
  id: "user-1",
  name: "Test Founder",
  email: "founder@example.com",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Builds the options with a fake mail service.
 *
 * @param send - What `sendEmailVerification` does.
 * @returns The options and the mock.
 */
function build(send: jest.Mock): ReturnType<typeof buildAuthOptions> {
  const mail = { sendEmailVerification: send } as unknown as MailService;
  // The Prisma adapter only stores the client here; no query runs in these tests.
  const prisma = {} as PrismaService;
  return buildAuthOptions({ prisma, mail, settings });
}

/** Lets the not-awaited send and its `.catch` run. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("buildAuthOptions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("enables email and password with required verification, and GitHub", () => {
    const options = build(jest.fn());

    expect(options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
    });
    expect(options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    });
    expect(options.socialProviders?.github).toMatchObject({
      clientId: "fake-id",
      clientSecret: "fake-secret",
    });
  });

  it("trusts only the shared frontend origins, keeps telemetry off, encrypts OAuth tokens", () => {
    const options = build(jest.fn());

    expect(options.trustedOrigins).toEqual([...ALLOWED_ORIGINS]);
    expect(options.telemetry).toEqual({ enabled: false });
    expect(options.account?.encryptOAuthTokens).toBe(true);
    expect(options.secret).toBe(settings.secret);
    expect(options.baseURL).toBe(settings.baseURL);
  });

  it("sends the verification email through MailService", async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const options = build(send);

    await options.emailVerification?.sendVerificationEmail?.({
      user,
      url: "http://localhost:8080/api/auth/verify-email?token=abc",
      token: "abc",
    });

    expect(send).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Test Founder",
      email: "founder@example.com",
      url: "http://localhost:8080/api/auth/verify-email?token=abc",
      token: "abc",
    });
  });

  it("logs a failed send with the user id only, never the email", async () => {
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const send = jest.fn().mockRejectedValue(new EmailSendError("validation_error", false));
    const options = build(send);

    await options.emailVerification?.sendVerificationEmail?.({ user, url: "u", token: "t" });
    await flush();

    expect(warn).toHaveBeenCalledWith(
      "Verification email failed for user user-1 (validation_error)",
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("founder@example.com");
  });
});
