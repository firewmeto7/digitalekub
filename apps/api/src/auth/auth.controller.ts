import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RegisterProviderDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterProviderDto) {
    return this.authService.registerProvider(body);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: LogoutDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refreshToken);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}