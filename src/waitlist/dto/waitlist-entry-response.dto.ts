import { ApiProperty } from "@nestjs/swagger";
import { WAITLIST_ROLES } from "./create-waitlist-entry.dto";
import type { WaitlistRoleValue } from "./create-waitlist-entry.dto";

/**
 * Response shapes for the waitlist endpoint. The service maps database rows to these, so new
 * columns never leak into the API by accident.
 *
 * @packageDocumentation
 */

/** One saved waitlist entry as the API returns it. */
export class WaitlistEntryResponseDto {
  @ApiProperty({ example: "cm3k1x2y30000abcd1234efgh" })
  id: string;

  @ApiProperty({ example: "Ada Lovelace" })
  name: string;

  @ApiProperty({ example: "ada@example.com" })
  email: string;

  @ApiProperty({ enum: WAITLIST_ROLES, example: "other" })
  role: WaitlistRoleValue;

  @ApiProperty({ type: String, nullable: true, example: "Designer" })
  roleOther: string | null;

  @ApiProperty({ type: String, format: "date-time", example: "2026-11-14T16:20:00.000Z" })
  createdAt: Date;
}

/** Success envelope for `POST /api/v1/waitlist`. */
export class WaitlistEntryEnvelopeDto {
  @ApiProperty({ type: WaitlistEntryResponseDto })
  data: WaitlistEntryResponseDto;
}
