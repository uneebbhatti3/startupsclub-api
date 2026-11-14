import { Module } from "@nestjs/common";
import { WaitlistController } from "./waitlist.controller";
import { WaitlistRepository } from "./waitlist.repository";
import { WaitlistService } from "./waitlist.service";

/**
 * The waitlist feature: controller → service → repository. `PrismaService` comes from the
 * global `PrismaModule`.
 *
 * @packageDocumentation
 */

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistRepository],
})
export class WaitlistModule {}
