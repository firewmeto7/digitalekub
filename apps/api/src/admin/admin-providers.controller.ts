import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/guards/jwt-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ProvidersService } from "../providers/providers.service";
import { RejectProviderDto } from "./dto/reject-provider.dto";

@Controller("admin/providers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get("pending")
  getPending() {
    return this.providersService.getPending();
  }

  @Get(":id/id-image")
  async getIdImage(@Param("id") providerId: string) {
    const image = await this.providersService.getIdImage(providerId);
    return new StreamableFile(image.data, {
      type: image.mimeType,
      disposition: `inline; filename="provider-${providerId}-id-image"`,
    });
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  approve(@CurrentUser() admin: AuthenticatedUser, @Param("id") providerId: string) {
    return this.providersService.approve(admin, providerId);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() admin: AuthenticatedUser,
    @Param("id") providerId: string,
    @Body() body: RejectProviderDto,
  ) {
    return this.providersService.reject(admin, providerId, body.reason);
  }
}