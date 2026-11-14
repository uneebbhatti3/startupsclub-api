import { PrismaService } from "./prisma.service";

/**
 * Unit tests for {@link PrismaService}: configuration checks and lifecycle hooks. No database is
 * contacted; the client's connect and disconnect methods are replaced with spies.
 *
 * @packageDocumentation
 */

describe("PrismaService", () => {
  const originalUrl = process.env.DATABASE_URL as string;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
    jest.restoreAllMocks();
  });

  it("throws a clear error when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => new PrismaService()).toThrow("DATABASE_URL is not set");
  });

  it("connects on module init and disconnects on module destroy", async () => {
    process.env.DATABASE_URL = "postgresql://unit:unit@localhost:5432/unit";
    const service = new PrismaService();
    const connect = jest.spyOn(service, "$connect").mockResolvedValue();
    const disconnect = jest.spyOn(service, "$disconnect").mockResolvedValue();

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
