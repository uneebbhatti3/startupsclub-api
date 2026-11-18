/**
 * The frontend origins allowed to call the API with credentials. One list, used both for CORS
 * (`main.ts`) and for better-auth's `trustedOrigins` (`src/auth/auth.ts`), so the two never
 * drift apart.
 *
 * @packageDocumentation
 */

/** Frontend origins: local Next.js dev server and the production site. */
export const ALLOWED_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "https://www.startupsclub.one",
];
