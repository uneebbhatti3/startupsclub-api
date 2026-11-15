import { ApiProperty } from "@nestjs/swagger";

/**
 * Response shapes for `GET /api/v1/waitlist/count`: the total number of signups and nothing that
 * identifies anyone.
 *
 * @packageDocumentation
 */

/** The waitlist total as the API returns it. */
export class WaitlistCountResponseDto {
  @ApiProperty({ example: 123, minimum: 0 })
  count: number;
}

/** Success envelope for `GET /api/v1/waitlist/count`. */
export class WaitlistCountEnvelopeDto {
  @ApiProperty({ type: WaitlistCountResponseDto })
  data: WaitlistCountResponseDto;
}
