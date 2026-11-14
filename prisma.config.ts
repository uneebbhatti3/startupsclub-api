import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7): where the schema and migrations live and which database
 * URL the CLI uses. Prisma 7 no longer loads `.env` itself, so `dotenv/config` does it here.
 *
 * @packageDocumentation
 */

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
