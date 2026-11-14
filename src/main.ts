// Loads .env for local runs before anything reads process.env. It never overrides variables that
// are already set, so CI, Docker and Render keep their own values.
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureApp } from "./common/app-setup";

/**
 * Application entry point: loads local environment variables, applies the shared HTTP setup,
 * serves the OpenAPI docs outside production and starts the HTTP server.
 *
 * @packageDocumentation
 */

/** Environments that serve the OpenAPI docs. Production never does. */
const DOCS_ENVIRONMENTS = new Set(["local", "staging"]);

/**
 * Serves Swagger UI at /api/docs when `APP_ENV` is local or staging.
 *
 * @param app - The Nest application.
 */
function setupSwagger(app: NestExpressApplication): void {
  if (!DOCS_ENVIRONMENTS.has(process.env.APP_ENV ?? "")) {
    return;
  }
  const config = new DocumentBuilder()
    .setTitle("StartupsClub API")
    .setVersion(process.env.APP_VERSION ?? "local")
    .build();
  SwaggerModule.setup("api/docs", app, () => SwaggerModule.createDocument(app, config));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  setupSwagger(app);
  // On SIGTERM (a Render restart or deploy), let shutdown hooks run: emails still being sent
  // finish before the process exits.
  app.enableShutdownHooks();
  app.enableCors({
    credentials: true,
    origin: ["http://localhost:3000", "https://www.startupsclub.one"],
  });
  await app.listen(process.env.PORT ?? 8080);
}

void bootstrap();
