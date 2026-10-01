import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProviderStatus, UserRole } from "@prisma/client";
import { AuthenticatedUser } from "./jwt-auth.guard";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user || !requiredRoles.includes(request.user.role)) {
      return false;
    }
    if (request.user.role === UserRole.PROVIDER) {
      const provider = await this.prisma.provider.findUnique({
        where: { userId: request.user.sub },
        select: { status: true, verifiedAt: true },
      });
      return provider?.status === ProviderStatus.APPROVED && provider.verifiedAt !== null;
    }
    return true;
  }
}