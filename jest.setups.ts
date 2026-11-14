import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Jest setup for the end-to-end tests: loads `.env.test` so `DATABASE_URL` points at the local
 * `_test` database. Variables that are already set (CI) are never overridden, except `APP_ENV`,
 * which is always `test` so no test can send real email through Resend.
 *
 * @packageDocumentation
 */

config({ path: resolve(__dirname, ".env.test"), quiet: true });
process.env.APP_ENV = "test";
