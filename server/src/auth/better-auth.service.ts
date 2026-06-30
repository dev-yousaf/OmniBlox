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
        provider: 'postgresql',
        url: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || '',
      },
      emailAndPassword: {
        enabled: true,
      },
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
        cookie: {
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      },
      trustedOrigins: [
        process.env.CORS_ORIGIN || 'http://localhost:3000',
        process.env.BACKEND_URL || 'http://localhost:5005',
      ].filter(Boolean),
    });
  }
}
