import { Injectable, Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import type { Auth } from 'better-auth';

@Injectable()
export class BetterAuthService {
  public readonly auth: Auth;
  private readonly logger = new Logger(BetterAuthService.name);

  constructor() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      this.logger.warn(
        'AUTH_SECRET is not set. Better Auth sessions will not be secure until you configure it in apps/server/.env',
      );
    }

    this.auth = betterAuth({
      secret: secret || 'development-secret-change-me',
      database: {
        // We'll configure this later to use Prisma
        provider: 'postgresql',
        url: process.env.DATABASE_URL || '',
      },
    });
  }
}
