import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

/** Shape returned by `GET /health`. The deploy pipeline reads `data.version`. */
export interface HealthResponse {
  data: {
    status: "ok";
    version: string;
  };
}

/**
 * Public liveness endpoint used by Render's health check, the Docker HEALTHCHECK and the
 * deploy pipeline. It deliberately does not touch the database, so a slow or sleeping
 * dependency never makes Render restart a healthy process. Keep it free of secrets.
 * Not rate limited, because Render and Docker poll it.
 */
@SkipThrottle()
@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      data: {
        status: "ok",
        version: process.env.APP_VERSION ?? "unknown",
      },
    };
  }
}
