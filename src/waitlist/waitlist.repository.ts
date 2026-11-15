import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import type { WaitlistEntry, WaitlistRole } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Database access for the waitlist, and nothing else: no validation, no HTTP concerns. The
 * service decides what a duplicate means for the caller.
 *
 * @packageDocumentation
 */

/** Prisma's error code for a unique constraint violation. */
const UNIQUE_VIOLATION = "P2002";

/** The values needed to insert one waitlist row. */
export interface CreateWaitlistEntryData {
  name: string;
  email: string;
  role: WaitlistRole;
  roleOther: string | null;
}

@Injectable()
export class WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts a waitlist entry. The email's unique constraint makes this race-safe in one query.
   *
   * @param data - The row to insert.
   * @returns The saved row, or `null` when the email is already on the waitlist.
   */
  async create(data: CreateWaitlistEntryData): Promise<WaitlistEntry | null> {
    try {
      return await this.prisma.waitlistEntry.create({ data });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Counts every waitlist entry.
   *
   * @returns The number of rows in `waitlist_entries`.
   */
  async count(): Promise<number> {
    return this.prisma.waitlistEntry.count();
  }
}
