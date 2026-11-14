import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Jest setup for the end-to-end tests: loads `.env.test` so `DATABASE_URL` points at the local
 * `_test` database. Variables that are already set (CI) are never overridden.
 *
 * @packageDocumentation
 */

config({ path: resolve(__dirname, ".env.test"), quiet: true });
