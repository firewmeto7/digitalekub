import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { ProvidersModule } from "../providers/providers.module";
import { AdminProvidersController } from "./admin-providers.controller";

@Module({
  imports: [AuthModule, PrismaModule, ProvidersModule],
  controllers: [AdminProvidersController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AdminModule {}