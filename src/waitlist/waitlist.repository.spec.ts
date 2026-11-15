import { Prisma, WaitlistRole } from "../../generated/prisma/client";
import type { WaitlistEntry } from "../../generated/prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { WaitlistRepository } from "./waitlist.repository";
import type { CreateWaitlistEntryData } from "./waitlist.repository";

/**
 * Unit tests for {@link WaitlistRepository}. Prisma is replaced with a stub; no database is used.
 *
 * @packageDocumentation
 */

const input: CreateWaitlistEntryData = {
  name: "Test User",
  email: "test.user@example.com",
  role: WaitlistRole.FOUNDER,
  roleOther: null,
};

const saved: WaitlistEntry = {
  id: "cm0000000000000000000test",
  ...input,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

/**
 * Builds a repository on top of a stubbed `waitlistEntry.create`.
 *
 * @param create - The stub.
 * @returns The repository under test.
 */
function buildRepository(create: jest.Mock): WaitlistRepository {
  const prisma = { waitlistEntry: { create } } as unknown as PrismaService;
  return new WaitlistRepository(prisma);
}

describe("WaitlistRepository", () => {
  it("inserts the row and returns it", async () => {
    const create = jest.fn().mockResolvedValue(saved);

    await expect(buildRepository(create).create(input)).resolves.toEqual(saved);
    expect(create).toHaveBeenCalledWith({ data: input });
  });

  it("returns null when the email already exists (P2002)", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
    const create = jest.fn().mockRejectedValue(duplicate);

    await expect(buildRepository(create).create(input)).resolves.toBeNull();
  });

  it("rethrows any other error", async () => {
    const failure = new Error("connection lost");
    const create = jest.fn().mockRejectedValue(failure);

    await expect(buildRepository(create).create(input)).rejects.toBe(failure);
  });

  it("counts every entry", async () => {
    const count = jest.fn().mockResolvedValue(42);
    const prisma = { waitlistEntry: { count } } as unknown as PrismaService;

    await expect(new WaitlistRepository(prisma).count()).resolves.toBe(42);
    expect(count).toHaveBeenCalledWith();
  });
});
