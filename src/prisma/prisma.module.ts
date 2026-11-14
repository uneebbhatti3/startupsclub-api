import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Global module that provides {@link PrismaService}. Imported once in `AppModule`, after which
 * any feature service can inject `PrismaService` without importing this module again.
 *
 * @packageDocumentation
 */

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
