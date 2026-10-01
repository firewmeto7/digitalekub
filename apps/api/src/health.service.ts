import { Injectable, OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import { Redis } from "ioredis";
import type { ServiceHealth } from "@digitalekub/shared-types";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ServiceHealth> {
    const redisConnection = this.redis.status === "wait" ? this.redis.connect() : Promise.resolve();
    const [database, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => "ok" as const).catch(() => "error" as const),
      redisConnection.then(() => this.redis.ping()).then(() => "ok" as const).catch(() => "error" as const),
    ]);
    const result: ServiceHealth = {
      status: database === "ok" && redis === "ok" ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      dependencies: { database, redis },
    };

    if (result.status !== "ok") {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  async onModuleDestroy() {
    if (this.redis.status === "ready") {
      await this.redis.quit();
    } else {
      this.redis.disconnect();
    }
  }
}