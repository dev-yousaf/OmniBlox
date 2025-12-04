import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // The 'super' call invokes the constructor of the PrismaClient.
    // We pass it a configuration object to override the default datasource URL.
    const databaseUrl =
      process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

    if (databaseUrl) {
      // If a runtime database URL is available, pass it explicitly to Prisma.
      super({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
        log: ['error', 'warn'],
        // Add connection timeout and pool settings for Neon
        // This helps with auto-suspend/wake scenarios
        __internal: {
          engine: {
            connect_timeout: 20, // 20 seconds timeout
          },
        },
      });
    } else {
      // If no DB URL is provided, avoid passing `undefined` to PrismaClient.
      // Let Prisma use its default behavior (read from `schema.prisma` env()).
      console.warn(
        '[PrismaService] No DATABASE_URL or DATABASE_URL_POOLED found; creating PrismaClient without explicit datasource override.',
      );

      super();
    }
  }

  async onModuleInit() {
    // Retry connection up to 3 times to handle Neon auto-suspend
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[PrismaService] Connecting to database (attempt ${attempt}/${maxRetries})...`,
        );
        await this.$connect();
        console.log(
          '[PrismaService] Database connected successfully (using pooled connection)',
        );
        return; // Success, exit the function
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[PrismaService] Connection attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        );

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(
            `[PrismaService] Retrying in ${waitTime / 1000} seconds...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    console.error(
      '[PrismaService] Failed to connect to database after',
      maxRetries,
      'attempts:',
      lastError?.message,
    );
    console.error(
      '[PrismaService] The application will continue, but database operations may fail.',
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('[PrismaService] Database disconnected');
  }
}
