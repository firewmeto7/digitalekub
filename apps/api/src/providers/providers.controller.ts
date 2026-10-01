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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/guards/jwt-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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

}