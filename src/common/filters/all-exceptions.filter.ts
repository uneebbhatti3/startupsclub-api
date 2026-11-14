import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import type { ErrorDetailDto, ErrorResponseDto } from "../dto/error-response.dto";

/**
 * Global exception filter: turns every thrown error into the `{ error: { code, message, details } }`
 * shape. HTTP exceptions keep their status and may carry their own `code`; anything else becomes
 * a 500 with a generic message, so stack traces, SQL and internal messages never reach clients.
 *
 * @packageDocumentation
 */

/** Fallback codes for HTTP exceptions thrown without an explicit `code`. */
const DEFAULT_CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
};

/**
 * Narrows an unknown value to a plain object.
 *
 * @param value - Any value.
 * @returns Whether `value` is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Builds the error body for an HTTP exception, preferring the `code`, `message` and `details` it
 * was thrown with.
 *
 * @param exception - The HTTP exception.
 * @returns The response body.
 */
export function toErrorResponse(exception: HttpException): ErrorResponseDto {
  const status = exception.getStatus();
  const payload = exception.getResponse();
  const fallbackCode = DEFAULT_CODES[status] ?? "HTTP_ERROR";

  if (isRecord(payload)) {
    const code = typeof payload.code === "string" ? payload.code : fallbackCode;
    const message = typeof payload.message === "string" ? payload.message : exception.message;
    const details = Array.isArray(payload.details) ? (payload.details as ErrorDetailDto[]) : [];
    return { error: { code, message, details } };
  }

  return { error: { code: fallbackCode, message: exception.message, details: [] } };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(toErrorResponse(exception));
      return;
    }

    this.logger.error(
      "Unhandled error",
      exception instanceof Error ? exception.stack : String(exception),
    );
    const body: ErrorResponseDto = {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong", details: [] },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
