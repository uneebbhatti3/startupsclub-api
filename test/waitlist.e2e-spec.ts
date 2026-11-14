import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/common/app-setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { EmailSender } from "../src/mail/email-sender";
import { InMemoryEmailSender } from "../src/mail/in-memory-email.sender";
import { MAIL_RETRY_DELAYS_MS, MAIL_SETTINGS } from "../src/mail/mail.config";

/**
 * End-to-end tests for `POST /api/v1/waitlist` against the real `_test` database, with the same
 * prefix, validation, error shape and rate limit as the running app. Each test gets a fresh app,
 * so the in-memory rate limit starts from zero, and an empty table. Email goes to an in-memory
 * sender; nothing is delivered.
 *
 * @packageDocumentation
 */

const URL = "/api/v1/waitlist";

/**
 * Waits until the background welcome email reaches the mailbox, or fails after 2 seconds.
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

describe("Waitlist (e2e)", () => {
  let app: NestExpressApplication;
  let mailbox: InMemoryEmailSender;

  beforeEach(async () => {
    mailbox = new InMemoryEmailSender();
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailSender)
      .useValue(mailbox)
      .overrideProvider(MAIL_SETTINGS)
      .useValue({ welcomeTemplateId: "welcome-template" })
      .overrideProvider(MAIL_RETRY_DELAYS_MS)
      .useValue([])
      .compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    await app.get(PrismaService).waitlistEntry.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  it("201: saves a signup and returns it with a normalised email", async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send({ name: " Test Founder ", email: " Founder@Example.COM ", role: "founder" })
      .expect(201);

    expect(res.body).toEqual({
      data: {
        id: expect.any(String),
        name: "Test Founder",
        email: "founder@example.com",
        role: "founder",
        roleOther: null,
        createdAt: expect.any(String),
      },
    });
  });

  it("201: saves roleOther for the other role", async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send({
        name: "Test Other",
        email: "other@example.com",
        role: "other",
        roleOther: "Designer",
      })
      .expect(201);

    expect(res.body.data).toMatchObject({ role: "other", roleOther: "Designer" });
  });

  it("409: rejects an email already on the waitlist, whatever its case", async () => {
    const server = app.getHttpServer();
    await request(server)
      .post(URL)
      .send({ name: "Test Dev", email: "dev@example.com", role: "developer" })
      .expect(201);

    const res = await request(server)
      .post(URL)
      .send({ name: "Test Dev", email: "DEV@example.com", role: "developer" })
      .expect(409);

    expect(res.body).toEqual({
      error: { code: "WAITLIST_EMAIL_EXISTS", message: "Already in the waitlist", details: [] },
    });
    await waitForMail(mailbox, 1);
    expect(mailbox.sent).toHaveLength(1);
  });

  it("sends the welcome email in the background after a signup", async () => {
    await request(app.getHttpServer())
      .post(URL)
      .send({ name: "Test Mail", email: "mail@example.com", role: "founder" })
      .expect(201);

    await waitForMail(mailbox, 1);
    expect(mailbox.sent).toEqual([
      {
        to: "mail@example.com",
        templateId: "welcome-template",
        variables: { NAME: "Test Mail" },
        idempotencyKey: expect.stringMatching(/^waitlist-welcome\//),
      },
    ]);
  });

  it("201: the signup succeeds even when the email fails", async () => {
    mailbox.failNext(new Error("Provider down"));

    await request(app.getHttpServer())
      .post(URL)
      .send({ name: "Test Fail", email: "fail@example.com", role: "founder" })
      .expect(201);
  });

  it("400: reports invalid fields", async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send({ name: "", email: "nope", role: "other" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    const fields = (res.body.error.details as { field: string }[]).map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "roleOther"]));
  });

  it("400: rejects unknown fields", async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send({ name: "Test", email: "extra@example.com", role: "founder", isAdmin: true })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("429: allows 5 signups a minute per client", async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i += 1) {
      await request(server)
        .post(URL)
        .send({ name: "Test", email: `limit${i}@example.com`, role: "founder" })
        .expect(201);
    }

    const res = await request(server)
      .post(URL)
      .send({ name: "Test", email: "limit5@example.com", role: "founder" })
      .expect(429);

    expect(res.body.error.code).toBe("TOO_MANY_REQUESTS");
  });
});
