import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { isSuperadmin: true },
    });

    if (!dbUser || !dbUser.isSuperadmin) {
      throw new UnauthorizedException('Superadmin access required');
    }

    return true;
  }
}
