import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/guards/jwt-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CreatePaymentAccountDto,
  PatchProviderDto,
  RegisterProviderKycDto,
} from "./dto/provider.dto";
import { ProvidersService, UploadedProviderImage } from "./providers.service";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ID_IMAGE_SIZE = 5 * 1024 * 1024;

@Controller("providers")
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post("register")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("id_image", {
      limits: { fileSize: MAX_ID_IMAGE_SIZE },
      fileFilter: (_request, file, callback) => {
        if (!ACCEPTED_IMAGE_TYPES.has(file.mimetype)) {
          callback(new BadRequestException("id_image must be a JPEG, PNG, or WebP image"), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RegisterProviderKycDto,
    @UploadedFile()
    image?: UploadedProviderImage,
  ) {
    if (!image) {
      throw new BadRequestException("id_image is required");
    }
    return this.providersService.submitKyc(user, body, image);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.providersService.getMe(user);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  patchMe(@CurrentUser() user: AuthenticatedUser, @Body() body: PatchProviderDto) {
    return this.providersService.patchMe(user, body);
  }

  @Post("me/payment-accounts")
  @UseGuards(JwtAuthGuard)
  addPaymentAccount(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePaymentAccountDto) {
    return this.providersService.addPaymentAccount(user, body);
  }

  @Get("me/payment-accounts")
  @UseGuards(JwtAuthGuard)
  getPaymentAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.providersService.getPaymentAccounts(user);
  }

  @Delete("me/payment-accounts/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  deletePaymentAccount(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.providersService.deletePaymentAccount(user, id);
  }

  @Get("pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPending() {
    return this.providersService.getPending();
  }

  @Get(":id/id-image")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getIdImage(@Param("id") providerId: string) {
    const image = await this.providersService.getIdImage(providerId);
    return new StreamableFile(image.data, {
      type: image.mimeType,
      disposition: `inline; filename="provider-${providerId}-id-image"`,
    });
  }

  @Patch(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(@CurrentUser() admin: AuthenticatedUser, @Param("id") providerId: string) {
    return this.providersService.approve(admin, providerId);
  }
}