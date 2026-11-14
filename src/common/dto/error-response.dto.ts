import { ApiProperty } from "@nestjs/swagger";

/**
 * The failure envelope every endpoint uses: `{ error: { code, message, details } }`. Documented
 * for OpenAPI and produced by `AllExceptionsFilter`.
 *
 * @packageDocumentation
 */

/** One field that failed validation. */
export class ErrorDetailDto {
  @ApiProperty({ example: "email" })
  field: string;

  @ApiProperty({ type: [String], example: ["email must be an email"] })
  messages: string[];
}

/** The body of the `error` key. */
export class ErrorBodyDto {
  @ApiProperty({ example: "VALIDATION_FAILED", description: "Stable, machine-readable code." })
  code: string;

  @ApiProperty({ example: "Request validation failed", description: "Safe to show to the user." })
  message: string;

  @ApiProperty({ type: [ErrorDetailDto] })
  details: ErrorDetailDto[];
}

/** The full failure response. */
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}
