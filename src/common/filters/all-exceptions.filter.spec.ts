import { ConflictException, HttpStatus, Logger, NotFoundException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { createValidationPipe } from "../pipes/validation.pipe";
import { AllExceptionsFilter } from "./all-exceptions.filter";

/**
 * Unit tests for the global error shape: coded HTTP errors, uncoded HTTP errors, validation
 * failures and unexpected errors (which must not leak their message).
 *
 * @packageDocumentation
 */

interface Captured {
  status?: number;
  body?: unknown;
}

/**
 * Runs the filter against a fake Express response and captures what it sends.
 *
 * @param exception - The thrown value.
 * @returns The status and JSON body.
 */
function run(exception: unknown): Captured {
  const captured: Captured = {};
  const response = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);
  return captured;
}

describe("AllExceptionsFilter", () => {
  it("keeps the code and message an HTTP exception was thrown with", () => {
    const result = run(new ConflictException({ code: "SOME_CODE", message: "Readable message" }));

    expect(result).toEqual({
      status: HttpStatus.CONFLICT,
      body: { error: { code: "SOME_CODE", message: "Readable message", details: [] } },
    });
  });

  it("falls back to a code based on the status", () => {
    const result = run(new NotFoundException());

    expect(result.status).toBe(HttpStatus.NOT_FOUND);
    expect(result.body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("reports validation failures with per-field details", () => {
    const pipe = createValidationPipe() as unknown as {
      exceptionFactory: (errors: unknown[]) => unknown;
    };
    const exception = pipe.exceptionFactory([
      { property: "email", constraints: { isEmail: "email must be an email" }, children: [] },
    ]);

    expect(run(exception)).toEqual({
      status: HttpStatus.BAD_REQUEST,
      body: {
        error: {
          code: "VALIDATION_FAILED",
          message: "Request validation failed",
          details: [{ field: "email", messages: ["email must be an email"] }],
        },
      },
    });
  });

  it("hides unexpected errors behind a generic 500", () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    const result = run(new Error("SELECT * FROM secret_table failed"));

    expect(result).toEqual({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong", details: [] } },
    });
  });
});
