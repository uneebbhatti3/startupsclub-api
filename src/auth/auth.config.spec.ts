import { readAuthSettings } from "./auth.config";

/**
 * Unit tests for the auth settings: placeholders in tests, and a refusal to start without the
 * real settings in local, staging and production. Values here are fake.
 *
 * @packageDocumentation
 */

const KEYS = [
  "APP_ENV",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;

describe("auth config", () => {
  const saved = new Map(KEYS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("uses test placeholders when APP_ENV is test", () => {
    process.env.APP_ENV = "test";
    for (const key of KEYS.slice(1)) {
      delete process.env[key];
    }

    const settings = readAuthSettings();

    expect(settings.baseURL).toBe("http://localhost:8080");
    expect(settings.github.clientId).toBe("test-github-client-id");
    expect(settings.secret.length).toBeGreaterThanOrEqual(32);
  });

  it("reads the real settings when APP_ENV is local", () => {
    process.env.APP_ENV = "local";
    process.env.BETTER_AUTH_SECRET = " fake-secret-for-unit-test-only-0123456789 ";
    process.env.BETTER_AUTH_URL = "http://localhost:8080";
    process.env.GITHUB_CLIENT_ID = "fake-id";
    process.env.GITHUB_CLIENT_SECRET = "fake-secret";

    expect(readAuthSettings()).toEqual({
      secret: "fake-secret-for-unit-test-only-0123456789",
      baseURL: "http://localhost:8080",
      github: { clientId: "fake-id", clientSecret: "fake-secret" },
    });
  });

  it("refuses to start without a setting outside tests", () => {
    process.env.APP_ENV = "production";
    process.env.BETTER_AUTH_SECRET = "fake-secret-for-unit-test-only-0123456789";
    process.env.BETTER_AUTH_URL = "https://api.example.com";
    process.env.GITHUB_CLIENT_ID = "fake-id";
    delete process.env.GITHUB_CLIENT_SECRET;

    expect(() => readAuthSettings()).toThrow("GITHUB_CLIENT_SECRET is not set");
  });
});
