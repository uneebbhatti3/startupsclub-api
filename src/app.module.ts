import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaService } from "./prisma/prisma.service";
import { createAuth } from "./auth/auth";
import { readAuthSettings } from "./auth/auth.config";
import { HealthController } from "./health/health.controller";
import { AppMailModule } from "./mail/mail.module";
import { MailService } from "./mail/mail.service";
import { WaitlistModule } from "./waitlist/waitlist.module";

/**
 * Root module: global Prisma access, global email (`Mailer`), the global rate limiter (100
 * requests a minute per IP by default, tighter per route where needed), authentication
 * (better-auth under `/api/auth/*`, with a global guard: every route needs a session unless it
 * is marked `@AllowAnonymous()` or `@OptionalAuth()`) and the feature modules.
 *
 * @packageDocumentation
 */

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AppMailModule,
    AuthModule.forRootAsync({
      inject: [PrismaService, MailService],
      useFactory: (prisma: PrismaService, mail: MailService) => ({
        auth: createAuth({ prisma, mail, settings: readAuthSettings() }),
      }),
    }),
    WaitlistModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
