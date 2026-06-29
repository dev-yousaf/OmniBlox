import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { auth } from '../../auth/auth.config';
import { fromNodeHeaders } from 'better-auth/node';

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Validate session using Better Auth cookies
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session || !session.session) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Attach session user data to request for downstream decorators
    request.user = {
      userId: session.user.id,
      email: session.user.email,
      role: (session.user as any).role,
      companyId: (session.user as any).companyId,
    };

    // Also attach session for CompanyId decorator
    request.session = {
      ...request.session,
      companyId: (session.user as any).companyId,
    };

    // Check superadmin status and OWNER role from DB
    const dbUser = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperadmin: true, role: true },
    });

    if (!dbUser || !dbUser.isSuperadmin || dbUser.role !== 'OWNER') {
      throw new UnauthorizedException('Superadmin access required');
    }

    return true;
  }
}