import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ProvidersModule } from "./providers/providers.module";

@Module({
  imports: [PrismaModule, AuthModule, ProvidersModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}