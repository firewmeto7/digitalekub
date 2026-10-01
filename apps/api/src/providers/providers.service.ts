import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProviderStatus, UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreatePaymentAccountDto,
  PatchProviderDto,
  RegisterProviderKycDto,
} from "./dto/provider.dto";

const providerResponse = {
  id: true,
  userId: true,
  displayName: true,
  phone: true,
  status: true,
  verifiedAt: true,
  businessName: true,
  ownerName: true,
  licenseNumber: true,
  idImageMimeType: true,
  address: true,
  city: true,
  region: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { email: true, fullName: true } },
} as const;

export type UploadedProviderImage = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async submitKyc(user: AuthenticatedUser, input: RegisterProviderKycDto, image: UploadedProviderImage) {
    const provider = await this.findOwnProvider(user);
    if (provider.status === ProviderStatus.APPROVED) {
      throw new ConflictException("Approved provider KYC cannot be resubmitted");
    }
    const actualMimeType = this.detectImageType(image.buffer);
    if (!actualMimeType || actualMimeType !== image.mimetype) {
      throw new BadRequestException("Uploaded image content does not match its image type");
    }

    try {
      const updated = await this.prisma.provider.update({
        where: { id: provider.id },
        data: {
          businessName: input.business_name.trim(),
          ownerName: input.owner_name.trim(),
          licenseNumber: input.license_number.trim(),
          idImageData: image.buffer,
          idImageMimeType: actualMimeType,
          address: input.address.trim(),
          city: input.city.trim(),
          region: input.region.trim(),
          status: ProviderStatus.PENDING,
        },
        select: providerResponse,
      });
      return { provider: this.serializeProvider(updated) };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("A provider already uses this license number");
      }
      throw error;
    }
  }

  async getMe(user: AuthenticatedUser) {
    const provider = await this.findOwnProvider(user, providerResponse);
    return { provider: this.serializeProvider(provider) };
  }

  async patchMe(user: AuthenticatedUser, input: PatchProviderDto) {
    const provider = await this.findOwnProvider(user);
    const kycFieldsChanged = Boolean(
      input.business_name !== undefined ||
        input.owner_name !== undefined ||
        input.address !== undefined ||
        input.city !== undefined ||
        input.region !== undefined,
    );
    if (provider.status === ProviderStatus.APPROVED && kycFieldsChanged) {
      throw new ConflictException("Approved KYC details cannot be changed through this route");
    }

    const updated = await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        displayName: input.display_name?.trim(),
        businessName: input.business_name?.trim(),
        ownerName: input.owner_name?.trim(),
        address: input.address?.trim(),
        city: input.city?.trim(),
        region: input.region?.trim(),
      },
      select: providerResponse,
    });
    return { provider: this.serializeProvider(updated) };
  }

  async addPaymentAccount(user: AuthenticatedUser, input: CreatePaymentAccountDto) {
    const provider = await this.findOwnProvider(user);
    const account = await this.prisma.providerPaymentAccount.create({
      data: {
        providerId: provider.id,
        methodType: input.method_type.trim(),
        accountName: input.account_name.trim(),
        accountNumber: input.account_number.trim(),
        instructions: input.instructions.trim(),
      },
    });
    return { paymentAccount: this.serializePaymentAccount(account) };
  }

  async getPaymentAccounts(user: AuthenticatedUser) {
    const provider = await this.findOwnProvider(user);
    const accounts = await this.prisma.providerPaymentAccount.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "asc" },
    });
    return { paymentAccounts: accounts.map((account) => this.serializePaymentAccount(account)) };
  }

  async deletePaymentAccount(user: AuthenticatedUser, id: string) {
    const provider = await this.findOwnProvider(user);
    const deleted = await this.prisma.providerPaymentAccount.deleteMany({
      where: { id, providerId: provider.id },
    });
    if (deleted.count === 0) {
      throw new NotFoundException("Payment account not found");
    }
    return { deleted: true, id };
  }

  async getPending() {
    const providers = await this.prisma.provider.findMany({
      where: { status: ProviderStatus.PENDING },
      select: { ...providerResponse, idImageData: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      providers: providers.map(({ idImageData, ...provider }) => ({
        ...this.serializeProvider(provider),
        hasIdImage: idImageData !== null,
      })),
    };
  }

  async getIdImage(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { idImageData: true, idImageMimeType: true },
    });
    if (!provider?.idImageData || !provider.idImageMimeType) {
      throw new NotFoundException("Provider KYC image not found");
    }
    return { data: Buffer.from(provider.idImageData), mimeType: provider.idImageMimeType };
  }

  async approve(admin: AuthenticatedUser, providerId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException("Provider not found");
    }
    if (
      provider.verifiedAt === null ||
      !provider.businessName ||
      !provider.ownerName ||
      !provider.licenseNumber ||
      !provider.idImageData ||
      !provider.address ||
      !provider.city ||
      !provider.region
    ) {
      throw new ConflictException("Provider KYC must be complete before approval");
    }
    if (provider.status === ProviderStatus.APPROVED) {
      return { provider: { id: provider.id, status: provider.status } };
    }

    const [, log] = await this.prisma.$transaction([
      this.prisma.provider.update({
        where: { id: provider.id },
        data: { status: ProviderStatus.APPROVED },
        select: { id: true, status: true },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId: admin.sub,
          action: "PROVIDER_APPROVED",
          entity: "Provider",
          entityId: provider.id,
          details: { previousStatus: provider.status, status: ProviderStatus.APPROVED },
        },
      }),
    ]);
    return { provider: { id: provider.id, status: ProviderStatus.APPROVED }, adminLogId: log.id };
  }

  private async findOwnProvider<T extends object = typeof providerResponse>(
    user: AuthenticatedUser,
    select?: T,
  ) {
    if (user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException("Provider account required");
    }
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.sub },
      ...(select ? { select } : {}),
    });
    if (!provider) {
      throw new NotFoundException("Provider profile not found");
    }
    return provider;
  }

  private serializeProvider(provider: Record<string, any>) {
    const { businessName, ownerName, licenseNumber, idImageMimeType, ...rest } = provider;
    return {
      ...rest,
      business_name: businessName,
      owner_name: ownerName,
      license_number: licenseNumber,
      has_id_image: Boolean(idImageMimeType),
      id_image_mime_type: idImageMimeType,
    };
  }

  private serializePaymentAccount(account: {
    id: string;
    methodType: string;
    accountName: string;
    accountNumber: string;
    instructions: string;
    isPrimary: boolean;
    createdAt: Date;
  }) {
    return {
      id: account.id,
      method_type: account.methodType,
      account_name: account.accountName,
      account_number: account.accountNumber,
      instructions: account.instructions,
      is_primary: account.isPrimary,
      created_at: account.createdAt,
    };
  }

  private detectImageType(buffer: Buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return "image/png";
    }
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      return "image/webp";
    }
    return null;
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}