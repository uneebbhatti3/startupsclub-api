import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * End-to-end check that the full application boots with Prisma 7 and can run a query against a
 * real PostgreSQL database (the `_test` database locally, the service container in CI).
 *
 * @packageDocumentation
 */

describe("PrismaService (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("runs a query against the database", async () => {
    const prisma = app.get(PrismaService);
    const rows = await prisma.$queryRaw<{ result: number }[]>`SELECT 1::int AS result`;
    expect(rows).toEqual([{ result: 1 }]);
  });
});
