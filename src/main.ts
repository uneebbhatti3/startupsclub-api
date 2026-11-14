// Loads .env for local runs before anything reads process.env. It never overrides variables that
// are already set, so CI, Docker and Render keep their own values.
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

/**
 * Application entry point: loads local environment variables and starts the HTTP server.
 *
 * @packageDocumentation
 */

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 8080);
}

void bootstrap();
