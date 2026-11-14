import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * The single Prisma 7 client for the whole application. It connects to PostgreSQL through the
 * `pg` driver adapter, opens the connection when the module starts and closes it on shutdown.
 * Inject this service; never create another `PrismaClient`.
 *
 * @packageDocumentation
 */

/**
 * Builds the PostgreSQL driver adapter from `DATABASE_URL`, failing fast when it is missing so
 * the app never starts without a database.
 *
 * @returns The configured `pg` adapter.
 */
function createAdapter(): PrismaPg {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.example and docs/DATABASE.md.");
  }
  return new PrismaPg({ connectionString });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
