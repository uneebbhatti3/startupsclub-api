import { ConflictException, Logger } from "@nestjs/common";
import { WaitlistRole } from "../../generated/prisma/client";
import type { WaitlistEntry } from "../../generated/prisma/client";
import type { CreateWaitlistEntryDto } from "./dto/create-waitlist-entry.dto";
import { EmailSendError } from "../mail/email-sender";
import type { MailService } from "../mail/mail.service";
import type { WaitlistRepository } from "./waitlist.repository";
import { WAITLIST_EMAIL_EXISTS, WaitlistService } from "./waitlist.service";

/**
 * Unit tests for {@link WaitlistService}: role mapping, duplicate handling, response mapping and
 * the background welcome email. The repository and the mail service are stubs.
 *
 * @packageDocumentation
 */

const createdAt = new Date("2026-01-01T00:00:00.000Z");

const founderDto: CreateWaitlistEntryDto = {
  name: "Test Founder",
  email: "founder@example.com",
  role: "founder",
};

const founderRow: WaitlistEntry = {
  id: "id-1",
  name: "Test Founder",
  email: "founder@example.com",
  role: WaitlistRole.FOUNDER,
  roleOther: null,
  createdAt,
};

/**
 * Builds the service on top of a stubbed repository `create` and mail `sendWaitlistWelcome`.
 *
 * @param create - Repository stub.
 * @param send - Mail stub; resolves by default.
 * @returns The service under test.
 */
function buildService(
  create: jest.Mock,
  send: jest.Mock = jest.fn().mockResolvedValue(undefined),
): WaitlistService {
  return new WaitlistService(
    { create } as unknown as WaitlistRepository,
    { sendWaitlistWelcome: send } as unknown as MailService,
  );
}

/** Lets pending promise callbacks (such as a `.catch`) run. */
async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("WaitlistService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("saves a founder with no roleOther and returns the lowercase role", async () => {
    const create = jest.fn().mockResolvedValue(founderRow);

    const result = await buildService(create).create(founderDto);

    expect(create).toHaveBeenCalledWith({
      name: "Test Founder",
      email: "founder@example.com",
      role: WaitlistRole.FOUNDER,
      roleOther: null,
    });
    expect(result).toEqual({
      id: "id-1",
      name: "Test Founder",
      email: "founder@example.com",
      role: "founder",
      roleOther: null,
      createdAt,
    });
  });

  it("passes roleOther through when the role is other", async () => {
    const dto: CreateWaitlistEntryDto = {
      name: "Test Other",
      email: "other@example.com",
      role: "other",
      roleOther: "Designer",
    };
    const create = jest.fn().mockResolvedValue({
      ...founderRow,
      id: "id-2",
      name: dto.name,
      email: dto.email,
      role: WaitlistRole.OTHER,
      roleOther: "Designer",
    });

    const result = await buildService(create).create(dto);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ role: WaitlistRole.OTHER, roleOther: "Designer" }),
    );
    expect(result.role).toBe("other");
    expect(result.roleOther).toBe("Designer");
  });

  it("throws a 409 WAITLIST_EMAIL_EXISTS and sends no email when the email is taken", async () => {
    const send = jest.fn();
    const error = await buildService(jest.fn().mockResolvedValue(null), send)
      .create(founderDto)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({
      code: WAITLIST_EMAIL_EXISTS,
      message: "Already in the waitlist",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends the welcome email to the saved name and address", async () => {
    const send = jest.fn().mockResolvedValue(undefined);

    await buildService(jest.fn().mockResolvedValue(founderRow), send).create(founderDto);

    expect(send).toHaveBeenCalledWith({
      entryId: "id-1",
      name: "Test Founder",
      email: "founder@example.com",
    });
  });

  it("returns without waiting for the email to be sent", async () => {
    const neverSettles = jest.fn().mockReturnValue(new Promise(() => undefined));

    await expect(
      buildService(jest.fn().mockResolvedValue(founderRow), neverSettles).create(founderDto),
    ).resolves.toMatchObject({ id: "id-1" });
  });

  it("still succeeds when the email fails, and logs only the entry id and error code", async () => {
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const send = jest.fn().mockRejectedValue(new EmailSendError("validation_error", false));

    await expect(
      buildService(jest.fn().mockResolvedValue(founderRow), send).create(founderDto),
    ).resolves.toMatchObject({ id: "id-1" });
    await flushPromises();

    expect(warn).toHaveBeenCalledWith(
      "Welcome email failed for waitlist entry id-1 (validation_error)",
    );
    expect(String(warn.mock.calls[0]?.[0])).not.toContain("founder@example.com");
  });
});
