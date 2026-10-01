import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterProviderDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\+?[0-9][0-9 -]{6,19}$/)
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;
}

export class VerifyOtpDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  identifier?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emailOrPhone?: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;
}

export class LoginDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  emailOrPhone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  emailOrPhone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ResetPasswordDto extends ForgotPasswordDto {
  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}