import { Global, Module } from "@nestjs/common";
import { EmailSender } from "./email-sender";
import {
  createEmailSender,
  DEFAULT_RETRY_DELAYS_MS,
  MAIL_RETRY_DELAYS_MS,
  MAIL_SETTINGS,
  readMailSettings,
} from "./mail.config";
import { MailService } from "./mail.service";

/**
 * Application-wide email (global), so any feature can inject `MailService`. The sender and
 * template IDs come from `mail.config.ts`; tests override `EmailSender`.
 *
 * @packageDocumentation
 */

@Global()
@Module({
  providers: [
    { provide: EmailSender, useFactory: createEmailSender },
    { provide: MAIL_SETTINGS, useFactory: readMailSettings },
    { provide: MAIL_RETRY_DELAYS_MS, useValue: DEFAULT_RETRY_DELAYS_MS },
    MailService,
  ],
  exports: [MailService],
})
export class AppMailModule {}
