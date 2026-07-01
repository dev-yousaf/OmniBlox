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
    additionalFields: {
      companyId: {
        type: 'string',
        required: true,
      },
      role: {
        type: 'string',
        required: true,
      },
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
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { companyId: true, role: true },
          });

          if (!user) {
            throw new Error('User not found');
          }

          return {
            data: {
              ...session,
              companyId: user.companyId,
              role: user.role,
            },
          };
        },
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5005',
  secret: process.env.AUTH_SECRET,
  trustedOrigins: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    process.env.BACKEND_URL || 'http://localhost:5005',
    // Allow all Vercel preview deployments
    ...(process.env.NODE_ENV === 'production' ? ['https://*.vercel.app'] : []),
  ].filter(Boolean),
});
