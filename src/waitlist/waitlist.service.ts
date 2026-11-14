import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { WaitlistRole } from "../../generated/prisma/client";
import type { WaitlistEntry } from "../../generated/prisma/client";
import type { CreateWaitlistEntryDto, WaitlistRoleValue } from "./dto/create-waitlist-entry.dto";
import type { WaitlistEntryResponseDto } from "./dto/waitlist-entry-response.dto";
import { EmailSendError } from "../mail/email-sender";
import { MailService } from "../mail/mail.service";
import { WaitlistRepository } from "./waitlist.repository";

/**
 * Business logic for the waitlist: maps API roles to the database enum, turns a duplicate email
 * into a 409 the user can read, maps saved rows to the response DTO, and sends the welcome email
 * in the background so the signup never waits for (or fails because of) email delivery.
 *
 * @packageDocumentation
 */

/** Error code returned when the email is already registered. */
export const WAITLIST_EMAIL_EXISTS = "WAITLIST_EMAIL_EXISTS";

const ROLE_TO_DB: Record<WaitlistRoleValue, WaitlistRole> = {
  founder: WaitlistRole.FOUNDER,
  developer: WaitlistRole.DEVELOPER,
  other: WaitlistRole.OTHER,
};

const ROLE_FROM_DB: Record<WaitlistRole, WaitlistRoleValue> = {
  [WaitlistRole.FOUNDER]: "founder",
  [WaitlistRole.DEVELOPER]: "developer",
  [WaitlistRole.OTHER]: "other",
};

/**
 * Maps a database row to the API response.
 *
 * @param entry - The saved row.
 * @returns The response DTO.
 */
function toResponse(entry: WaitlistEntry): WaitlistEntryResponseDto {
  return {
    id: entry.id,
    name: entry.name,
    email: entry.email,
    role: ROLE_FROM_DB[entry.role],
    roleOther: entry.roleOther,
    createdAt: entry.createdAt,
  };
}

/**
 * Names an email failure for the logs without its message, which can contain the address.
 *
 * @param error - What the send rejected with.
 * @returns The provider's error code, or the error's class name.
 */
function describe(error: unknown): string {
  if (error instanceof EmailSendError) {
    return error.code;
  }
  return error instanceof Error ? error.name : "UnknownError";
}

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly repository: WaitlistRepository,
    private readonly mail: MailService,
  ) {}

  /**
   * Adds someone to the waitlist, then starts the welcome email without waiting for it.
   *
   * @param dto - The validated, normalised request body.
   * @returns The saved entry.
   * @throws ConflictException (`WAITLIST_EMAIL_EXISTS`) when the email is already registered.
   */
  async create(dto: CreateWaitlistEntryDto): Promise<WaitlistEntryResponseDto> {
    const entry = await this.repository.create({
      name: dto.name,
      email: dto.email,
      role: ROLE_TO_DB[dto.role],
      roleOther: dto.role === "other" ? (dto.roleOther ?? null) : null,
    });

    if (!entry) {
      throw new ConflictException({
        code: WAITLIST_EMAIL_EXISTS,
        message: "Already in the waitlist",
      });
    }

    this.sendWelcomeEmail(entry);
    return toResponse(entry);
  }

  /**
   * Starts the welcome email (the Resend template) in the background. `MailService` retries
   * transient failures; a final failure is only logged, with the entry id and error code but
   * never the address, because the signup is already saved.
   *
   * @param entry - The saved row.
   */
  private sendWelcomeEmail(entry: WaitlistEntry): void {
    // Deliberately not awaited: the HTTP response must not wait for the email provider.
    void this.mail
      .sendWaitlistWelcome({ entryId: entry.id, name: entry.name, email: entry.email })
      .catch((error: unknown) => {
        this.logger.warn(
          `Welcome email failed for waitlist entry ${entry.id} (${describe(error)})`,
        );
      });
  }
}
