import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterProviderKycDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  business_name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  owner_name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  license_number!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  region!: string;
}

export class PatchProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  business_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  owner_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  region?: string;
}

export class CreatePaymentAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  method_type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  account_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  account_number!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  instructions!: string;
}

export class ProviderIdParamDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  id!: string;
}