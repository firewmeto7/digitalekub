import { createHash, randomInt } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserRole } from "@prisma/client";
import { Redis } from "ioredis";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterProviderDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from "./dto/auth.dto";

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
const OTP_SECONDS = 5 * 60;
const MAX_OTP_ATTEMPTS = 5;
const userWithProvider = { provider: true } satisfies Prisma.UserInclude;
type AuthUser = Prisma.UserGetPayload<{ include: typeof userWithProvider }>;
type SessionClaims = { sub: string; role: UserRole; type: "access" | "refresh" };

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerProvider(input: RegisterProviderDto) {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.replace(/[ -]/g, "");
    if (Buffer.byteLength(input.password, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 bytes");
    }
    await this.redis.ping();

    const [existingEmail, existingPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.provider.findUnique({ where: { phone } }),
    ]);
    if (existingEmail || existingPhone) {
      throw new ConflictException("An account with this email or phone already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: input.fullName.trim(),
        role: UserRole.PROVIDER,
        provider: {
          create: { displayName: input.displayName.trim(), phone },
        },
      },
      include: userWithProvider,
    });

    await this.issueOtp(user.id, "provider-verification", phone);
    return {
      message: "Provider registration received. Verify the OTP to continue.",
      provider: {
        id: user.provider!.id,
        email: user.email,
        phone: user.provider!.phone,
        status: user.provider!.status,
        verified: false,
      },
    };
  }

  async verifyOtp(input: VerifyOtpDto) {
    const identifier = this.identifier(input);
    if (!identifier) {
      throw new BadRequestException("Email or phone is required");
    }
    const user = await this.findUser(identifier);
    if (user.role !== UserRole.PROVIDER || !user.provider) {
      throw new UnauthorizedException("Invalid verification request");
    }
    if (user.provider.verifiedAt) {
      return { verified: true };
    }

    await this.consumeOtp(`auth:otp:provider-verification:${user.id}`, input.otp);
    await this.prisma.provider.update({
      where: { id: user.provider.id },
      data: { verifiedAt: new Date() },
    });
    return { verified: true };
  }

  async login(input: LoginDto) {
    const identifier = this.identifier(input);
    if (!identifier) {
      throw new BadRequestException("Email or phone is required");
    }
    const user = await this.findUser(identifier);
    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.role === UserRole.PROVIDER && !user.provider?.verifiedAt) {
      throw new ForbiddenException("Verify your phone before signing in");
    }
    return this.createSession(user);
  }

  async refresh(refreshToken: string) {
    const claims = await this.verifyRefreshToken(refreshToken);
    const tokenKey = this.refreshKey(refreshToken);
    const storedUserId = await this.redis.call("GETDEL", tokenKey);
    if (storedUserId !== claims.sub) {
      throw new UnauthorizedException("Refresh token is expired or revoked");
    }
    await this.redis.srem(this.userRefreshKey(claims.sub), tokenKey);

    const user = await this.prisma.user.findUnique({ where: { id: claims.sub }, include: userWithProvider });
    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }
    return this.createSession(user);
  }

  async logout(refreshToken: string) {
    const claims = await this.verifyRefreshToken(refreshToken);
    const tokenKey = this.refreshKey(refreshToken);
    await this.redis.del(tokenKey);
    await this.redis.srem(this.userRefreshKey(claims.sub), tokenKey);
    return { loggedOut: true };
  }

  async forgotPassword(input: ForgotPasswordDto) {
    const identifier = this.identifier(input);
    if (identifier) {
      const user = await this.findUserOrNull(identifier);
      if (user) {
        await this.issueOtp(user.id, "password-reset", identifier);
      }
    }
    return { message: "If the account exists, password reset instructions have been issued." };
  }

  async resetPassword(input: ResetPasswordDto) {
    const identifier = this.identifier(input);
    if (!identifier) {
      throw new BadRequestException("Email or phone is required");
    }
    if (Buffer.byteLength(input.newPassword, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 bytes");
    }
    const user = await this.findUser(identifier);
    await this.consumeOtp(`auth:otp:password-reset:${user.id}`, input.otp);
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await this.revokeUserRefreshTokens(user.id);
    return { passwordReset: true };
  }

  async onModuleDestroy() {
    if (this.redis.status === "ready") {
      await this.redis.quit();
    } else {
      this.redis.disconnect();
    }
  }

  private async createSession(user: AuthUser) {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role, type: "access" } satisfies SessionClaims,
      { expiresIn: ACCESS_TOKEN_SECONDS },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role, type: "refresh" } satisfies SessionClaims,
      { expiresIn: REFRESH_TOKEN_SECONDS },
    );
    const tokenKey = this.refreshKey(refreshToken);
    await this.redis
      .multi()
      .set(tokenKey, user.id, "EX", REFRESH_TOKEN_SECONDS)
      .sadd(this.userRefreshKey(user.id), tokenKey)
      .expire(this.userRefreshKey(user.id), REFRESH_TOKEN_SECONDS)
      .exec();

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        providerStatus: user.provider?.status,
      },
    };
  }

  private async issueOtp(userId: string, purpose: string, identifier: string) {
    const otp = String(randomInt(100000, 1000000));
    const key = `auth:otp:${purpose}:${userId}`;
    await this.redis.del(`${key}:attempts`);
    await this.redis.set(key, await bcrypt.hash(otp, 10), "EX", OTP_SECONDS);
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] ${purpose} OTP for ${identifier}: ${otp}`);
    }
  }

  private async consumeOtp(key: string, otp: string) {
    const attemptsKey = `${key}:attempts`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, OTP_SECONDS);
    }
    if (attempts > MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException("Too many OTP attempts");
    }

    const storedHash = await this.redis.get(key);
    const matches = storedHash && (await bcrypt.compare(otp, storedHash));
    if (!matches) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }
    await this.redis.del(key, attemptsKey);
  }

  private async verifyRefreshToken(refreshToken: string): Promise<SessionClaims> {
    try {
      const claims = await this.jwtService.verifyAsync<SessionClaims>(refreshToken);
      if (!claims.sub || claims.type !== "refresh" || !Object.values(UserRole).includes(claims.role)) {
        throw new Error("Invalid refresh token claims");
      }
      return claims;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private async findUser(identifier: string): Promise<AuthUser> {
    const user = await this.findUserOrNull(identifier);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return user;
  }

  private findUserOrNull(identifier: string) {
    const normalized = identifier.trim();
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized.toLowerCase() },
          { provider: { is: { phone: normalized.replace(/[ -]/g, "") } } },
        ],
      },
      include: userWithProvider,
    });
  }

  private identifier(input: {
    identifier?: string;
    emailOrPhone?: string;
    email?: string;
    phone?: string;
  }) {
    return input.identifier ?? input.emailOrPhone ?? input.email ?? input.phone;
  }

  private refreshKey(token: string) {
    return `auth:refresh:${createHash("sha256").update(token).digest("hex")}`;
  }

  private userRefreshKey(userId: string) {
    return `auth:refresh-user:${userId}`;
  }

  private async revokeUserRefreshTokens(userId: string) {
    const userKey = this.userRefreshKey(userId);
    const tokens = await this.redis.smembers(userKey);
    const transaction = this.redis.multi();
    if (tokens.length) {
      transaction.del(...tokens);
    }
    transaction.del(userKey);
    await transaction.exec();
  }
}