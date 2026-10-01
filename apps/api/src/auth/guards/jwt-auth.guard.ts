import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  sub: string;
  role: UserRole;
  type: "access";
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const [scheme, token] = authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Bearer access token required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      if (!payload.sub || payload.type !== "access" || !Object.values(UserRole).includes(payload.role)) {
        throw new Error("Invalid access token claims");
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}