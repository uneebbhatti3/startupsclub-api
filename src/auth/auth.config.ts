/**
 * Authentication configuration from environment variables. Local, staging and production refuse
 * to start without `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID` and
 * `GITHUB_CLIENT_SECRET`. Tests and CI (`APP_ENV` unset or `test`) use fixed placeholder values
 * that are not secrets and never reach GitHub.
 *
 * @packageDocumentation
 */

/** Environments that need real auth settings. */
const CONFIGURED_ENVIRONMENTS = new Set(["local", "staging", "production"]);

/** Placeholders for tests and CI only. They protect nothing and call nothing. */
const TEST_SETTINGS: AuthSettings = {
  secret: "test-only-better-auth-secret-never-used-outside-tests",
  baseURL: "http://localhost:8080",
  github: { clientId: "test-github-client-id", clientSecret: "test-github-client-secret" },
};

/** Settings better-auth needs. */
export interface AuthSettings {
  /** Signs and encrypts cookies and tokens. At least 32 random characters. */
  secret: string;
  /** Public URL of this API, e.g. `http://localhost:8080`; links in emails point here. */
  baseURL: string;
  /** GitHub OAuth app credentials. */
  github: { clientId: string; clientSecret: string };
}

/**
 * Reads a required variable.
 *
 * @param name - The variable name.
 * @returns Its value, trimmed.
 * @throws Error naming the variable when it is missing or empty.
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. See .env.example and docs/AUTH.md.`);
  }
  return value;
}

/**
 * Reads the auth settings for the current environment.
 *
 * @returns Real settings in local, staging and production; test placeholders elsewhere.
 */
export function readAuthSettings(): AuthSettings {
  if (!CONFIGURED_ENVIRONMENTS.has(process.env.APP_ENV ?? "")) {
    return TEST_SETTINGS;
  }
  return {
    secret: required("BETTER_AUTH_SECRET"),
    baseURL: required("BETTER_AUTH_URL"),
    github: {
      clientId: required("GITHUB_CLIENT_ID"),
      clientSecret: required("GITHUB_CLIENT_SECRET"),
    },
  };
}
