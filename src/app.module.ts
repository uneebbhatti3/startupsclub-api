import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";
import { AppMailModule } from "./mail/mail.module";
import { WaitlistModule } from "./waitlist/waitlist.module";

/**
 * Root module: global Prisma access, global email (`Mailer`), the global rate limiter (100
 * requests a minute per IP by default, tighter per route where needed) and the feature modules.
 *
 * @packageDocumentation
 */

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AppMailModule,
    WaitlistModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
