import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ProvidersController } from "./providers.controller";
import { ProvidersService } from "./providers.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, JwtAuthGuard, RolesGuard],
})
export class ProvidersModule {}