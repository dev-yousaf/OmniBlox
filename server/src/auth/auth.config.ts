import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    cookie: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  user: {
    additionalFields: {
      companyId: {
        type: 'string',
        required: true,
        input: false, // Don't allow users to set this directly
      },
      role: {
        type: 'string',
        required: true,
        input: false,
      },
    },
  },
  secret: process.env.AUTH_SECRET,
  trustedOrigins: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    process.env.BACKEND_URL || 'http://localhost:5005',
  ].filter(Boolean),
});
