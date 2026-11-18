import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/common/app-setup";
import { EmailSender } from "../src/mail/email-sender";
import { InMemoryEmailSender } from "../src/mail/in-memory-email.sender";
import { MAIL_RETRY_DELAYS_MS, MAIL_SETTINGS } from "../src/mail/mail.config";
import { EMAIL_VERIFICATION_SUBJECT } from "../src/mail/mail.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * End-to-end tests for better-auth under `/api/auth/*` against the real `_test` database:
 * email sign-up, the verification email and link, email sign-in, the session, and the start of
 * GitHub sign-in (only the authorize URL is built; GitHub is never called). Email goes to an
 * in-memory sender; nothing is delivered. All names and addresses are fake.
 *
 * @packageDocumentation
 */

const FRONTEND = "http://localhost:3000";
const EMAIL = "founder@example.com";
const PASSWORD = "correct-horse-battery";

/**
 * Waits until the mailbox holds a number of emails, or fails after 2 seconds.
 *
 * @param mailbox - The in-memory sender.
 * @param count - How many emails to wait for.
 */
async function waitForMail(mailbox: InMemoryEmailSender, count: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (mailbox.sent.length < count) {
    if (Date.now() > deadline) {
      throw new Error(`Expected ${count} email(s), got ${mailbox.sent.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * Pulls the verification link out of an email and makes it relative to the app.
 *
 * @param text - The plain-text email body.
 * @returns The path and query of the link.
 */
function verificationPath(text: string): string {
  const match = /https?:\/\/\S+\/api\/auth\/verify-email\?\S+/.exec(text);
  if (!match) {
    throw new Error("No verification link in the email");
  }
  const url = new URL(match[0]);
  return `${url.pathname}${url.search}`;
}

/**
 * Reads the Set-Cookie header as a list.
 *
 * @param header - The raw header value.
 * @returns The cookies.
 */
function cookiesOf(header: string | string[] | undefined): string[] {
  if (header === undefined) {
    return [];
  }
  return Array.isArray(header) ? header : [header];
}

describe("Auth (e2e)", () => {
  let app: NestExpressApplication;
  let mailbox: InMemoryEmailSender;
  let prisma: PrismaService;

  beforeEach(async () => {
    mailbox = new InMemoryEmailSender();
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailSender)
      .useValue(mailbox)
      .overrideProvider(MAIL_SETTINGS)
      .useValue({ from: "Startups Club <auth@example.com>" })
      .overrideProvider(MAIL_RETRY_DELAYS_MS)
      .useValue([])
      .compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    // Deleting users cascades to their sessions and accounts.
    await prisma.user.deleteMany();
    await prisma.verification.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  /**
   * Signs up the test user.
   *
   * @returns The response.
   */
  function signUp(): request.Test {
    return request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .set("Origin", FRONTEND)
      .send({ name: "Test Founder", email: EMAIL, password: PASSWORD, callbackURL: FRONTEND });
  }

  /**
   * Signs in the test user with email and password.
   *
   * @returns The response.
   */
  function signIn(): request.Test {
    return request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .set("Origin", FRONTEND)
      .send({ email: EMAIL, password: PASSWORD });
  }

  it("sign-up creates an unverified user, no session, and sends a verification email", async () => {
    const res = await signUp().expect(200);

    expect(res.body.token).toBeNull();
    expect(res.body.user).toMatchObject({
      name: "Test Founder",
      email: EMAIL,
      emailVerified: false,
    });
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);

    await waitForMail(mailbox, 1);
    expect(mailbox.sent[0]).toMatchObject({ to: EMAIL, subject: EMAIL_VERIFICATION_SUBJECT });
    expect(mailbox.sent[0]?.text).toContain("/api/auth/verify-email?token=");

    const account = await prisma.account.findFirstOrThrow({ where: { providerId: "credential" } });
    expect(account.password).not.toBe(PASSWORD);
  });

  it("rejects a password shorter than 8 characters", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .set("Origin", FRONTEND)
      .send({ name: "Test Founder", email: EMAIL, password: "short", callbackURL: FRONTEND })
      .expect(400);
  });

  it("blocks sign-in until the email is verified, and sends a fresh link", async () => {
    await signUp().expect(200);
    await waitForMail(mailbox, 1);

    const res = await signIn().expect(403);

    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
    await waitForMail(mailbox, 2);
  });

  it("verifying the email signs the user in and redirects to the frontend", async () => {
    await signUp().expect(200);
    await waitForMail(mailbox, 1);

    const res = await request(app.getHttpServer())
      .get(verificationPath(mailbox.sent[0]?.text ?? ""))
      .expect(302);

    expect(res.headers.location).toBe(FRONTEND);
    expect(cookiesOf(res.headers["set-cookie"]).join(";")).toContain("better-auth.session_token");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.emailVerified).toBe(true);
  });

  it("signs in a verified user and returns their session", async () => {
    await signUp().expect(200);
    await waitForMail(mailbox, 1);
    await request(app.getHttpServer())
      .get(verificationPath(mailbox.sent[0]?.text ?? ""))
      .expect(302);

    const signedIn = await signIn().expect(200);
    const cookies = cookiesOf(signedIn.headers["set-cookie"]);
    expect(cookies.join(";")).toContain("better-auth.session_token");

    const session = await request(app.getHttpServer())
      .get("/api/auth/get-session")
      .set("Cookie", cookies)
      .expect(200);
    expect(session.body.user).toMatchObject({ email: EMAIL, emailVerified: true });
  });

  it("rejects a wrong password", async () => {
    await signUp().expect(200);
    await waitForMail(mailbox, 1);
    await request(app.getHttpServer())
      .get(verificationPath(mailbox.sent[0]?.text ?? ""))
      .expect(302);

    await request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .set("Origin", FRONTEND)
      .send({ email: EMAIL, password: "wrong-password-123" })
      .expect(401);
  });

  it("has no session without a cookie", async () => {
    const res = await request(app.getHttpServer()).get("/api/auth/get-session").expect(200);

    expect(res.body).toBeNull();
  });

  it("starts GitHub sign-in with an authorize URL for a trusted callback", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/sign-in/social")
      .set("Origin", FRONTEND)
      .send({ provider: "github", callbackURL: `${FRONTEND}/dashboard` })
      .expect(200);

    const url = new URL(res.body.url);
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("test-github-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:8080/api/auth/callback/github",
    );
  });

  it("refuses a callback URL outside the trusted origins", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/sign-in/social")
      .set("Origin", FRONTEND)
      .send({ provider: "github", callbackURL: "https://untrusted.example.com/" })
      .expect(403);
  });
});
