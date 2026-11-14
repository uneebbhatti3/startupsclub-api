import { VersioningType } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter";
import { createValidationPipe } from "./pipes/validation.pipe";

/**
 * Cross-cutting HTTP setup shared by `main.ts` and the end-to-end tests, so tests exercise the
 * same prefix, validation and error shape as the running app.
 *
 * @packageDocumentation
 */

/**
 * Applies the global prefix, validation pipe, exception filter and proxy trust.
 *
 * @param app - The Nest application, before `init()` or `listen()`.
 */
export function configureApp(app: NestExpressApplication): void {
  // Render puts one proxy in front of the app; without this every client shares the proxy's IP
  // and the rate limiter would throttle everyone together. TO VERIFY on the first staging deploy.
  app.set("trust proxy", 1);
  // /health stays at the root: Render, the Docker HEALTHCHECK and the deploy pipeline call it there.
  app.setGlobalPrefix("api", { exclude: ["health"] });
  // Versions are opt-in per controller (`version: "1"` gives /api/v1/...). With no default
  // version, unversioned routes such as /health keep their path.
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
}
