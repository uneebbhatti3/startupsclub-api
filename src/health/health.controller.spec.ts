import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let healthController: HealthController;
  const originalVersion = process.env.APP_VERSION;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  afterEach(() => {
    if (originalVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = originalVersion;
    }
  });

  it("returns ok with the version from APP_VERSION", () => {
    process.env.APP_VERSION = "abc123";
    expect(healthController.check()).toEqual({
      data: { status: "ok", version: "abc123" },
    });
  });

  it('falls back to "unknown" when APP_VERSION is not set', () => {
    delete process.env.APP_VERSION;
    expect(healthController.check().data.version).toBe("unknown");
  });
});
