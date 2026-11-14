import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import type { ErrorDetailDto } from "../dto/error-response.dto";

/**
 * The global `ValidationPipe`: strips nothing silently (unknown fields are rejected), converts
 * payloads to DTO classes, and reports failures as `VALIDATION_FAILED` with one entry per field.
 *
 * @packageDocumentation
 */

/**
 * Flattens class-validator errors (including nested ones) into `{ field, messages }` entries.
 *
 * @param errors - Errors from class-validator.
 * @param parent - Path of the parent property, for nested objects.
 * @returns One detail per failing field.
 */
export function toErrorDetails(errors: ValidationError[], parent = ""): ErrorDetailDto[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own: ErrorDetailDto[] = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...toErrorDetails(error.children ?? [], field)];
  });
}

/**
 * Creates the application's validation pipe.
 *
 * @returns The configured pipe.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: toErrorDetails(errors),
      }),
  });
}
