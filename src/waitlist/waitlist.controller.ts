import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import { CreateWaitlistEntryDto } from "./dto/create-waitlist-entry.dto";
import { WaitlistCountEnvelopeDto } from "./dto/waitlist-count-response.dto";
import { WaitlistEntryEnvelopeDto } from "./dto/waitlist-entry-response.dto";
import { WaitlistService } from "./waitlist.service";

/**
 * HTTP endpoints for the waitlist: joining it (`POST /api/v1/waitlist`, rate limited to 5 a
 * minute) and reading the public total (`GET /api/v1/waitlist/count`, global rate limit).
 * Validation happens in the DTO and business rules in `WaitlistService`.
 *
 * @packageDocumentation
 */

/** Signups allowed per client IP per minute. */
const SIGNUPS_PER_MINUTE = 5;

@ApiTags("waitlist")
@Controller({ path: "waitlist", version: "1" })
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: SIGNUPS_PER_MINUTE, ttl: 60_000 } })
  @ApiOperation({ summary: "Join the waitlist" })
  @ApiCreatedResponse({ type: WaitlistEntryEnvelopeDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: "VALIDATION_FAILED" })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: "WAITLIST_EMAIL_EXISTS: Already in the waitlist",
  })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: "TOO_MANY_REQUESTS" })
  async create(@Body() dto: CreateWaitlistEntryDto): Promise<WaitlistEntryEnvelopeDto> {
    return { data: await this.waitlistService.create(dto) };
  }

  @Get("count")
  @ApiOperation({ summary: "Get the total number of waitlist signups" })
  @ApiOkResponse({ type: WaitlistCountEnvelopeDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: "TOO_MANY_REQUESTS" })
  async count(): Promise<WaitlistCountEnvelopeDto> {
    return { data: await this.waitlistService.count() };
  }
}
