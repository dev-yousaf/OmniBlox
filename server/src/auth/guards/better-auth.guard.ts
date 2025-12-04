import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { BetterAuthService } from '../better-auth.service';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private readonly betterAuth: BetterAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();

    // Validate the session using Better Auth cookies
    const session = await this.betterAuth.auth.api.getSession({
      headers: req.headers as any,
    });

    if (session && session.session) {
      // Attach the session data to request.user for downstream access
      (req as any).user = {
        userId: session.user.id,
        email: session.user.email,
        role: (session.user as any).role,
        companyId: (session.user as any).companyId,
      };
      return true;
    }

    return false;
  }
}
